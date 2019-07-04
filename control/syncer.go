package control

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/pkg/errors"

	config2 "github.com/pydio/cells/common/config"
	"github.com/pydio/cells/common/log"
	"github.com/pydio/cells/common/service/context"
	"github.com/pydio/cells/common/sync/merger"
	"github.com/pydio/cells/common/sync/model"
	"github.com/pydio/cells/common/sync/task"
	"github.com/pydio/sync/common"
	"github.com/pydio/sync/config"
	"github.com/pydio/sync/endpoint"
)

type Syncer struct {
	task    *task.Sync
	stop    chan bool
	uuid    string
	watches bool

	eventsChan  chan interface{}
	patchStatus chan model.ProcessStatus
	patchDone   chan interface{}
	cmd         *model.Command

	serviceCtx  context.Context
	configPath  string
	stateStore  StateStore
	patchStore  *endpoint.PatchStore
	snapFactory model.SnapshotFactory
	taskPaused  bool
	lastPatch   merger.Patch

	cleanSnapsAfterStop bool
	cleanAllAfterStop   bool
}

func NewSyncer(conf *config.Task) (*Syncer, error) {
	parseMessage := "invalid arguments: please provide left and right endpoints using a valid URI"
	if conf.LeftURI == "" || conf.RightURI == "" {
		return nil, fmt.Errorf(parseMessage)
	}
	leftEndpoint, err := endpoint.EndpointFromURI(conf.LeftURI, conf.RightURI)
	if err != nil {
		return nil, errors.Wrap(err, parseMessage)
	}
	rightEndpoint, err := endpoint.EndpointFromURI(conf.RightURI, conf.LeftURI)
	if err != nil {
		return nil, errors.Wrap(err, parseMessage)
	}

	var direction model.DirectionType
	switch conf.Direction {
	case "Bi":
		direction = model.DirectionBi
	case "Left":
		direction = model.DirectionLeft
	case "Right":
		direction = model.DirectionRight
	default:
		return nil, fmt.Errorf("unsupported direction type, please use one of Bi, Left, Right")
	}

	ctx := servicecontext.WithServiceName(context.Background(), "sync-task")
	ctx = servicecontext.WithServiceColor(ctx, servicecontext.ServiceColorGrpc)

	taskUuid := conf.Uuid
	syncTask := task.NewSync(leftEndpoint, rightEndpoint, direction)
	syncTask.SetFilters(conf.SelectiveRoots, []string{"**/.git**", "**/.pydio"})

	appDir := config2.ApplicationDataDir()
	configPath := filepath.Join(appDir, "sync", conf.Uuid)
	if _, er := os.Stat(configPath); er != nil && os.IsNotExist(er) {
		if er := os.MkdirAll(configPath, 0755); er != nil {
			return nil, er
		}
	}

	syncer := &Syncer{
		uuid:        taskUuid,
		serviceCtx:  ctx,
		task:        syncTask,
		watches:     conf.Realtime,
		configPath:  configPath,
		stateStore:  NewMemoryStateStore(conf),
		stop:        make(chan bool, 1),
		eventsChan:  make(chan interface{}),
		patchStatus: make(chan model.ProcessStatus),
		patchDone:   make(chan interface{}),
		cmd:         model.NewCommand(),
	}
	if patchStore, err := endpoint.NewPatchStore(configPath, leftEndpoint, rightEndpoint); err == nil {
		syncer.patchStore = patchStore
		syncTask.SetPatchPiper(syncer.patchStore)
	} else {
		log.Logger(ctx).Error("Cannot open patch store: " + err.Error())
	}
	var lastBatchSize int
	go func() {
		for {
			select {
			case l, ok := <-syncer.patchStatus:
				if !ok {
					return
				}
				msg := "Status: " + l.StatusString
				if l.Progress > 0 {
					msg += fmt.Sprintf(" - Progress: %d%%", int64(l.Progress*100))
				}
				status := common.SyncStatusProcessing
				if l.IsError {
					//status = common.SyncStatusError
					log.Logger(ctx).Error(msg)
				} else {
					log.Logger(ctx).Debug(msg)
				}
				state := syncer.stateStore.UpdateProcessStatus(l, status)
				bus.Pub(state, TopicState)

			case data, ok := <-syncer.patchDone:
				if !ok {
					return
				}
				deferIdle := true
				if patch, ok := data.(merger.Patch); ok {
					stats := patch.Stats()
					if patch.Size() > 0 {
						syncer.lastPatch = patch
						syncer.stateStore.TouchLastOpsTime()
					}
					if val, ok := stats["Errors"]; ok {
						errs := val.(map[string]int)
						msg := fmt.Sprintf("Processing ended on error (%d errors)! Pausing task.", errs["Total"])
						log.Logger(ctx).Error(msg)
						state := syncer.stateStore.UpdateProcessStatus(model.ProcessStatus{StatusString: msg, Progress: 1}, common.SyncStatusError)
						bus.Pub(state, TopicState)
						deferIdle = false
					} else if err, ok := patch.HasErrors(); ok {
						msg := fmt.Sprintf("Processing ended with %d errors! Pausing task.", len(err))
						log.Logger(ctx).Error(msg)
						state := syncer.stateStore.UpdateProcessStatus(model.ProcessStatus{StatusString: msg, Progress: 1}, common.SyncStatusError)
						bus.Pub(state, TopicState)
						deferIdle = false
					} else if val, ok := stats["Processed"]; ok {
						processed := val.(map[string]int)
						msg := fmt.Sprintf("Finished Processing %d files and folders", processed["Total"])
						log.Logger(ctx).Info(msg)
						state := syncer.stateStore.UpdateProcessStatus(model.ProcessStatus{StatusString: msg, Progress: 1}, common.SyncStatusIdle)
						bus.Pub(state, TopicState)
					} else {
						state := syncer.stateStore.UpdateProcessStatus(model.ProcessStatus{StatusString: "Task Idle"}, common.SyncStatusIdle)
						bus.Pub(state, TopicState)
						deferIdle = false
					}
					syncer.patchStore.Store(patch)
				}
				if deferIdle {
					go func() {
						<-time.After(3 * time.Second)
						state := syncer.stateStore.UpdateProcessStatus(model.ProcessStatus{StatusString: "Task Idle"}, common.SyncStatusIdle)
						bus.Pub(state, TopicState)
					}()
				}

			case e := <-syncer.eventsChan:
				go GetBus().Pub(e, TopicSync_+taskUuid)

			case <-time.After(5 * time.Minute):
				if lastBatchSize > 0 {
					log.Logger(ctx).Info("Sending Loop after 5mn Idle Time")
					GetBus().Pub(MessageSyncLoop, TopicSync_+taskUuid)
				}
				break
			}
		}
	}()
	syncTask.SetupCmd(syncer.cmd)
	syncTask.SetupEventsChan(syncer.patchStatus, syncer.patchDone, syncer.eventsChan)
	return syncer, nil

}

func (s *Syncer) dispatch(ctx context.Context, done chan bool) {

	bus := GetBus()
	topic := bus.Sub(TopicSyncAll, TopicSync_+s.uuid)

	for {
		select {

		case <-done:

			bus.Unsub(topic)
			s.task.Shutdown()
			close(s.eventsChan)
			close(s.patchDone)
			close(s.patchStatus)
			s.cmd.Stop()
			s.patchStore.Stop()
			log.Logger(ctx).Info("Stopping Service")
			if s.cleanSnapsAfterStop && s.snapFactory != nil {
				log.Logger(ctx).Info("Cleaning Snapsots")
				s.snapFactory.Reset(ctx)
			}
			if s.cleanAllAfterStop {
				log.Logger(ctx).Info("Cleaning all data for service")
				os.RemoveAll(s.configPath)
			}
			return

		case message := <-topic:

			switch message {
			case MessageRestart:
				// Message from supervisor, just update status
				bus.Pub(s.stateStore.UpdateSyncStatus(common.SyncStatusRestarting), TopicState)
			case MessageRestartClean:
				// Message from supervisor, just update status
				s.cleanSnapsAfterStop = true
				bus.Pub(s.stateStore.UpdateSyncStatus(common.SyncStatusRestarting), TopicState)
			case MessageHalt:
				// Message from supervisor, just update status
				bus.Pub(s.stateStore.UpdateSyncStatus(common.SyncStatusStopping), TopicState)
			case MessageHaltClean:
				// Message from supervisor, just update status
				s.cleanAllAfterStop = true
				bus.Pub(s.stateStore.UpdateSyncStatus(common.SyncStatusStopping), TopicState)
			case MessageResync:
				// Trigger a full resync
				state := s.stateStore.UpdateProcessStatus(model.ProcessStatus{StatusString: "Starting full resync", Progress: 0}, common.SyncStatusProcessing)
				bus.Pub(state, TopicState)
				s.task.Run(ctx, false, true)
			case MessageResyncDry:
				// Trigger a dry-run
				state := s.stateStore.UpdateProcessStatus(model.ProcessStatus{StatusString: "Running dry run", Progress: 0}, common.SyncStatusProcessing)
				bus.Pub(state, TopicState)
				s.task.Run(ctx, true, true)
			case MessageSyncLoop:
				if s.lastPatch != nil {
					if _, b := s.lastPatch.HasErrors(); b {
						// Trigger the loop
						state := s.stateStore.UpdateProcessStatus(model.ProcessStatus{StatusString: "Re-applying last patch that has errors", Progress: 0}, common.SyncStatusProcessing)
						bus.Pub(state, TopicState)
						s.task.ReApplyPatch(ctx, s.lastPatch)
						break
					}
				}
				state := s.stateStore.UpdateProcessStatus(model.ProcessStatus{StatusString: "Starting sync loop", Progress: 0}, common.SyncStatusProcessing)
				bus.Pub(state, TopicState)
				s.task.Run(ctx, false, false)
			case MessagePublishState:
				// Broadcast current state
				bus.Pub(s.stateStore.LastState(), TopicState)
			case MessagePublishStore:
				if s.patchStore != nil {
					bus.Pub(s.patchStore, TopicStore_+s.uuid)
				}
			case MessageInterrupt:
				s.cmd.Publish(model.Interrupt)
			case MessagePause:
				// Stop watching for events
				s.task.Pause(ctx)
				s.taskPaused = true
				state := s.stateStore.UpdateSyncStatus(common.SyncStatusPaused)
				bus.Pub(state, TopicState)
			case MessageResume:
				// Start watching for events
				s.task.Resume(ctx)
				s.taskPaused = false
				state := s.stateStore.UpdateSyncStatus(common.SyncStatusIdle)
				bus.Pub(state, TopicState)
				s.task.Run(ctx, false, false)
			case MessageDisable:
				// Disable Task
				s.task.Shutdown()
				state := s.stateStore.UpdateSyncStatus(common.SyncStatusDisabled)
				bus.Pub(state, TopicState)
			default:
				// Received info about an Endpoint
				if status, ok := message.(*model.EndpointStatus); ok {
					initialConnState := s.stateStore.BothConnected()
					var epConnected bool
					if status.WatchConnection == model.WatchConnected {
						log.Logger(ctx).Info(status.EndpointInfo.URI + " is now connected")
						epConnected = true
					} else {
						log.Logger(ctx).Info(status.EndpointInfo.URI + " is currently disconnected")
					}
					state := s.stateStore.UpdateConnection(epConnected, &status.EndpointInfo)
					newConnState := s.stateStore.BothConnected()
					if state.Status == common.SyncStatusIdle && newConnState && newConnState != initialConnState {
						log.Logger(ctx).Info("Both sides are connected, now launching a sync loop")
						s.task.Run(ctx, false, false)
					}
					bus.Pub(state, TopicState)

				}
				break
			}

		}
	}

}

func (s *Syncer) Serve() {

	ctx := s.serviceCtx

	log.Logger(ctx).Info("Starting Sync Service")

	s.snapFactory = endpoint.NewSnapshotFactory(s.configPath, s.task.Source, s.task.Target)
	s.task.SetSnapshotFactory(s.snapFactory)

	if s.patchStore != nil {
		if lasts, err := s.patchStore.Load(0, 1); err == nil && len(lasts) > 0 {
			s.lastPatch = lasts[0]
			s.stateStore.TouchLastOpsTime(s.lastPatch.GetStamp())
			if _, b := s.lastPatch.HasErrors(); b {
				s.stateStore.UpdateSyncStatus(common.SyncStatusError)
			} else {
				s.stateStore.UpdateSyncStatus(common.SyncStatusIdle)
			}
		}
	}

	done := make(chan bool, 1)
	go s.dispatch(ctx, done)

	s.task.Start(ctx, s.watches)

	for {
		select {
		case <-s.stop:
			done <- true
			return
		}
	}

}

func (s *Syncer) Stop() {
	s.stop <- true
}
