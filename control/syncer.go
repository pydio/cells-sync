/*
 * Copyright 2019 Abstrium SAS
 *
 *  This file is part of Cells Sync.
 *
 *  Cells Sync is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  Cells Sync is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with Cells Sync.  If not, see <https://www.gnu.org/licenses/>.
 */

package control

import (
	"context"
	"fmt"
	"github.com/pydio/cells-sync/common"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/pkg/errors"

	"github.com/pydio/cells-sync/config"
	"github.com/pydio/cells-sync/endpoint"
	"github.com/pydio/cells/v4/common/log"
	"github.com/pydio/cells/v4/common/service/context"
	"github.com/pydio/cells/v4/common/sync/merger"
	"github.com/pydio/cells/v4/common/sync/model"
	"github.com/pydio/cells/v4/common/sync/task"
)

// Syncer is a supervisor service wrapping a sync task.
type Syncer struct {
	task    *task.Sync
	stop    chan bool
	uuid    string
	watches bool

	eventsChan  chan interface{}
	patchStatus chan model.Status
	patchDone   chan interface{}
	cmd         *model.Command

	serviceCtx   context.Context
	configPath   string
	stateStore   StateStore
	patchStore   *endpoint.PatchStore
	snapFactory  model.SnapshotFactory
	taskPaused   bool
	lastPatch    merger.Patch
	dirtyStopped bool

	cleanSnapsAfterStop bool
	cleanAllAfterStop   bool
}

// NewSyncer creates a new running sync task.
func NewSyncer(conf *config.Task) (syncer *Syncer) {

	var startError error

	ctx := servicecontext.WithServiceName(context.Background(), "sync-task")
	configPath := filepath.Join(config.SyncClientDataDir(), conf.Uuid)
	stateStore := NewFileStateStore(conf, configPath)
	if stateStore.FileError != nil {
		log.Logger(ctx).Warn("Cannot open file for monitoring state : " + stateStore.FileError.Error())
	}

	// Check if app version has changed
	versionFile := filepath.Join(configPath, "version")
	var knownVersion string
	if vv, er := os.ReadFile(versionFile); er == nil {
		knownVersion = strings.TrimSpace(string(vv))
	}

	syncer = &Syncer{
		uuid:       conf.Uuid,
		serviceCtx: ctx,
		stop:       make(chan bool, 1),
		stateStore: stateStore,
		configPath: configPath,
	}

	if knownVersion != common.Version {
		log.Logger(ctx).Warn("App version has changed, clearing snapshots and launching a full resync")
		if er := os.Remove(filepath.Join(configPath, "snapshot-left")); er == nil {
			log.Logger(ctx).Warn(" - Cleared snapshot-left")
		}
		if er := os.Remove(filepath.Join(configPath, "snapshot-right")); er == nil {
			log.Logger(ctx).Warn(" - Cleared snapshot-right")
		}
		syncer.dirtyStopped = true
		if er := os.WriteFile(versionFile, []byte(common.Version), 0755); er != nil {
			log.Logger(ctx).Error(" - Cannot write version file: " + er.Error())
		}
	}

	if stateStore.PreviousState == model.TaskStatusProcessing {
		log.Logger(ctx).Warn("Last Status on this task was 'processing', this is not normal, will relaunch a full resync")
		syncer.dirtyStopped = true
	}

	defer func() {
		if startError != nil {
			stateStore.UpdateProcessStatus(model.NewProcessingStatus(startError.Error()).SetError(startError), model.TaskStatusError)
		}
	}()

	if conf.LeftURI == "" || conf.RightURI == "" {
		startError = fmt.Errorf("invalid arguments: please provide left and right endpoints using a valid URI")
		return
	}
	leftEndpoint, err := endpoint.EndpointFromURI(conf.LeftURI, conf.RightURI)
	if err != nil {
		startError = errors.Wrap(err, "cannot start left endpoint")
		return
	}
	rightEndpoint, err := endpoint.EndpointFromURI(conf.RightURI, conf.LeftURI)
	if err != nil {
		startError = errors.Wrap(err, "cannot start right endpoint")
		return
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
		startError = errors.Wrap(err, "unsupported direction type, please use one of Bi, Left, Right")
		return
	}

	syncTask := task.NewSync(leftEndpoint, rightEndpoint, direction)
	syncTask.SetFilters(conf.SelectiveRoots, []string{"**/.git**", "**/.pydio"})

	if _, er := os.Stat(configPath); er != nil && os.IsNotExist(er) {
		if er := os.MkdirAll(configPath, 0755); er != nil {
			startError = errors.Wrap(er, "cannot create configuration folder for task")
			return
		}
	}

	syncer.task = syncTask
	syncer.watches = conf.Realtime
	if conf.RealtimePaused {
		syncer.taskPaused = true
	}
	syncer.eventsChan = make(chan interface{})
	syncer.patchStatus = make(chan model.Status)
	syncer.patchDone = make(chan interface{})
	syncer.cmd = model.NewCommand()

	if patchStore, err := endpoint.NewPatchStore(configPath, leftEndpoint, rightEndpoint); err == nil {
		syncer.patchStore = patchStore
		syncTask.SetPatchListener(syncer.patchStore)

	} else {
		log.Logger(ctx).Error("Cannot open patch store: " + err.Error())
	}

	return

}

func (s *Syncer) dispatchStatus(ctx context.Context) {

	for {
		select {
		case l, ok := <-s.patchStatus:
			if !ok {
				return
			}
			msg := "Status: " + l.String()
			if l.Progress() > 0 {
				msg += fmt.Sprintf(" - Progress: %d%%", int64(l.Progress()*100))
			}
			status := model.TaskStatusProcessing
			if l.IsError() {
				status = model.TaskStatusError
				log.Logger(ctx).Error(msg)
			} else {
				log.Logger(ctx).Debug(msg)
			}
			s.stateStore.UpdateProcessStatus(l, status)

		case data, ok := <-s.patchDone:
			if !ok {
				return
			}
			var idleStatus = model.TaskStatusIdle
			if s.taskPaused {
				idleStatus = model.TaskStatusPaused
			}
			deferIdle := true
			stateStore := s.stateStore
			if patch, ok := data.(merger.Patch); ok {
				stats := patch.Stats()
				if patch.Size() > 0 {
					s.lastPatch = patch
					s.stateStore.TouchLastOpsTime()
					// Update Stats from snapshots
					if snapStats, err := s.task.RootStats(ctx, true); err == nil {
						log.Logger(ctx).Info("Stats after running patch")
						stateStore.UpdateEndpointStats(snapStats[s.task.Source.GetEndpointInfo().URI], s.task.Source.GetEndpointInfo())
						stateStore.UpdateEndpointStats(snapStats[s.task.Target.GetEndpointInfo().URI], s.task.Target.GetEndpointInfo())
					} else {
						log.Logger(ctx).Error("Cannot compute stats: " + err.Error())
					}
				}
				if val, ok := stats["Errors"]; ok {
					errs := val.(map[string]int)
					msg := fmt.Sprintf("Processing ended on error (%d errors)!", errs["Total"])
					log.Logger(ctx).Error(msg)
					stateStore.UpdateProcessStatus(model.NewProcessingStatus(msg), model.TaskStatusError)
					deferIdle = false
				} else if err, ok := patch.HasErrors(); ok {
					msg := fmt.Sprintf("Processing ended with %d errors!", len(err))
					log.Logger(ctx).Error(msg)
					erStatus := model.NewProcessingStatus(msg)
					erStatus.SetError(err[0])
					stateStore.UpdateProcessStatus(erStatus, model.TaskStatusError)
					deferIdle = false
				} else if val, ok := stats["Processed"]; ok {
					processed := val.(map[string]int)
					msg := fmt.Sprintf("Finished Processing %d files and folders", processed["Total"])
					log.Logger(ctx).Info(msg)
					stateStore.UpdateProcessStatus(model.NewProcessingStatus(msg), idleStatus)
				} else {
					stateStore.UpdateProcessStatus(model.NewProcessingStatus("Idle"), idleStatus)
					deferIdle = false
				}
				if s.patchStore != nil {
					s.patchStore.Store(patch)
				}
			}
			if deferIdle {
				go func() {
					<-time.After(3 * time.Second)
					stateStore.UpdateProcessStatus(model.NewProcessingStatus("Idle"), idleStatus)
				}()
			}

		case e := <-s.eventsChan:
			go GetBus().Pub(e, TopicSync_+s.uuid)

		case <-time.After(10 * time.Minute):
			log.Logger(ctx).Info("Sending Loop after 10mn Idle Time")
			GetBus().Pub(MessageSyncLoop, TopicSync_+s.uuid)
			break
		}
	}

}

func (s *Syncer) dispatchPublishBus(ctx context.Context, done chan bool) {
	bus := GetBus()
	topic := bus.Sub(TopicSyncAll, TopicSync_+s.uuid)
	for {
		select {
		case <-done:
			bus.Unsub(topic)
			return
		case message := <-topic:
			switch message {
			case MessagePublishStore:
				if s.patchStore != nil {
					bus.Pub(s.patchStore, TopicStore_+s.uuid)
				} else {
					bus.Pub(fmt.Errorf("patch store not ready"), TopicStore_+s.uuid)
				}
			case MessagePublishState:
				// Broadcast current state
				bus.Pub(s.stateStore.LastState(), TopicState)
			}
		}
	}

}

func (s *Syncer) dispatchBus(ctx context.Context, done chan bool) {

	bus := GetBus()
	topic := bus.Sub(TopicSyncAll, TopicSync_+s.uuid)

	for {
		select {

		case <-done:

			log.Logger(ctx).Info("Stopping Service")
			bus.Unsub(topic)
			if s.task != nil {
				log.Logger(ctx).Info("-- Stopping Task")
				s.task.Shutdown()
				close(s.eventsChan)
				close(s.patchDone)
				close(s.patchStatus)
				s.cmd.Stop()
			}
			if s.patchStore != nil {
				log.Logger(ctx).Info("-- Stopping PatchStore")
				s.patchStore.Stop()
			}
			if s.snapFactory != nil {
				if s.cleanAllAfterStop {
					log.Logger(ctx).Info("-- Cleaning Snapshots")
					s.snapFactory.Reset(ctx)
				} else {
					log.Logger(ctx).Info("-- Closing Snapshots")
					s.snapFactory.Close(ctx)
				}
			}
			if s.cleanAllAfterStop {
				log.Logger(ctx).Info("-- Cleaning all data for service")
				er := model.Retry(func() error {
					return os.RemoveAll(s.configPath)
				}, 2*time.Second, 15*time.Second)
				if er != nil {
					log.Logger(ctx).Error("Could not remove folder " + s.configPath + " : " + er.Error())
				}
				// Publish that this task has been removed
				bus.Pub(s.stateStore.UpdateSyncStatus(model.TaskStatusRemoved), TopicState)
			}
			if s.stateStore != nil {
				s.stateStore.Close()
			}
			return

		case message := <-topic:

			switch message {
			case MessageRestart:
				// Message from supervisor, just update status
				bus.Pub(s.stateStore.UpdateSyncStatus(model.TaskStatusRestarting), TopicState)
			case MessageRestartClean:
				// Message from supervisor, just update status
				s.cleanSnapsAfterStop = true
				bus.Pub(s.stateStore.UpdateSyncStatus(model.TaskStatusRestarting), TopicState)
			case MessageHalt:
				// Message from supervisor, just update status
				bus.Pub(s.stateStore.UpdateSyncStatus(model.TaskStatusStopping), TopicState)
			case MessageHaltClean:
				// Message from supervisor, just update status
				s.cleanAllAfterStop = true
				bus.Pub(s.stateStore.UpdateSyncStatus(model.TaskStatusStopping), TopicState)
			case MessageResync:
				// Trigger a full resync
				if s.lastPatch != nil {
					if _, b := s.lastPatch.HasErrors(); b {
						// Remove the lastPatch otherwise it will stick
						s.lastPatch = nil
					}
				}
				s.stateStore.UpdateProcessStatus(model.NewProcessingStatus("Starting full resync"), model.TaskStatusProcessing)
				s.task.Run(ctx, false, true)
			case MessageResyncDry:
				// Trigger a dry-run
				s.stateStore.UpdateProcessStatus(model.NewProcessingStatus("Dry-running sync"), model.TaskStatusProcessing)
				s.task.Run(ctx, true, true)
			case MessageSyncLoop:
				if s.lastPatch != nil {
					if _, b := s.lastPatch.HasErrors(); b {
						// Trigger the loop
						s.stateStore.UpdateProcessStatus(model.NewProcessingStatus("Re-applying last patch that had errors"), model.TaskStatusProcessing)
						s.task.ReApplyPatch(ctx, s.lastPatch)
						break
					}
				}
				s.stateStore.UpdateProcessStatus(model.NewProcessingStatus("Starting sync loop"), model.TaskStatusProcessing)
				s.task.Run(ctx, false, false)
				/*
					case MessagePublishState:
						// Broadcast current state
						bus.Pub(s.stateStore.LastState(), TopicState)

				*/
			case MessageInterrupt:
				s.cmd.Publish(model.Interrupt)
			case MessagePause:
				// Stop watching for events
				s.task.Pause(ctx)
				s.taskPaused = true
				state := s.stateStore.UpdateSyncStatus(model.TaskStatusPaused)
				config.Default().UpdateTaskPaused(s.uuid, true)
				bus.Pub(state, TopicState)
			case MessageResume:
				// Start watching for events
				if s.watches {
					s.task.Resume(ctx)
				}
				s.taskPaused = false
				state := s.stateStore.UpdateSyncStatus(model.TaskStatusIdle)
				config.Default().UpdateTaskPaused(s.uuid, false)
				bus.Pub(state, TopicState)
				s.task.Run(ctx, false, false)
			case MessageDisable:
				// Disable Task
				s.task.Shutdown()
				state := s.stateStore.UpdateSyncStatus(model.TaskStatusDisabled)
				bus.Pub(state, TopicState)
			default:
				// Received info about an Endpoint - TODO : move this inside StateStore
				if status, ok := message.(*model.EndpointStatus); ok {
					initialConnState := s.stateStore.BothConnected()
					var connected, updateConnection, active, updateActive, updateStats bool
					switch status.WatchConnection {
					case model.WatchConnected:
						log.Logger(ctx).Info(status.EndpointInfo.URI + " is now connected")
						connected = true
						updateConnection = true
					case model.WatchDisconnected:
						log.Logger(ctx).Info(status.EndpointInfo.URI + " is currently disconnected")
						//if s.task.
						connected = false
						updateConnection = true
					case model.WatchActive:
						active = true
						updateActive = true
					case model.WatchIdle:
						active = false
						updateActive = true
					case model.WatchStats:
						updateStats = true
					}
					if updateConnection {
						state := s.stateStore.UpdateConnection(connected, status.EndpointInfo)
						newConnState := s.stateStore.BothConnected()
						if state.Status == model.TaskStatusIdle && newConnState && newConnState != initialConnState {
							if s.dirtyStopped {
								s.dirtyStopped = false
								log.Logger(ctx).Info("Both sides are connected, now launching a full resync")
								s.task.Run(ctx, false, true)
							} else {
								log.Logger(ctx).Info("Both sides are connected, now launching a sync loop")
								s.task.Run(ctx, false, false)
							}
						}
						bus.Pub(state, TopicState)
					} else if updateActive {
						state := s.stateStore.UpdateWatcherActivity(active, status.EndpointInfo)
						bus.Pub(state, TopicState)
					} else if updateStats {
						state := s.stateStore.UpdateEndpointStats(status.Stats, status.EndpointInfo)
						bus.Pub(state, TopicState)
					}
				}
				break
			}

		}
	}

}

// Serve implements supervisor interface.
func (s *Syncer) Serve() {

	ctx := s.serviceCtx
	done := make(chan bool, 1)
	done2 := make(chan bool, 1)

	if s.task != nil {

		log.Logger(ctx).Info("Starting Sync Service")

		go s.dispatchStatus(ctx)
		go s.dispatchBus(ctx, done)
		go s.dispatchPublishBus(ctx, done2)

		s.task.SetupCmd(s.cmd)
		s.task.SetupEventsChan(s.patchStatus, s.patchDone, s.eventsChan)
		s.snapFactory = endpoint.NewSnapshotFactory(s.configPath, s.task.Source, s.task.Target)
		s.task.SetSnapshotFactory(s.snapFactory)

		if s.patchStore != nil {
			if lasts, err := s.patchStore.Load(0, 1); err == nil && len(lasts) > 0 {
				s.lastPatch = lasts[0]
				s.stateStore.TouchLastOpsTime(s.lastPatch.GetStamp())
				if errs, b := s.lastPatch.HasErrors(); b {
					s.stateStore.UpdateProcessStatus(model.NewProcessingStatus("Previous sync ended on error!").SetError(errs[0]), model.TaskStatusError)
				} else if s.taskPaused {
					s.stateStore.UpdateSyncStatus(model.TaskStatusPaused)
				} else {
					s.stateStore.UpdateSyncStatus(model.TaskStatusIdle)
				}
			}
		}

		s.task.Start(ctx, s.watches && !s.taskPaused)

	} else {

		log.Logger(ctx).Info("Syncer did not setup Task properly, do nothing")

		go s.dispatchBus(ctx, done)
		go s.dispatchPublishBus(ctx, done)

	}

	for {
		select {
		case <-s.stop:
			done2 <- true
			done <- true
			return
		}
	}

}

// Stop implements supervisor interface.
func (s *Syncer) Stop() {
	s.stop <- true
}
