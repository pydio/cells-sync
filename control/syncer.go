package control

import (
	"context"
	"fmt"
	"time"

	"github.com/pydio/sync/config"

	"github.com/pydio/cells/common/log"
	"github.com/pydio/cells/common/service/context"

	"github.com/pkg/errors"

	"github.com/pydio/cells/common/sync/model"
	"github.com/pydio/cells/common/sync/task"
	"github.com/pydio/sync/endpoint"
)

type Syncer struct {
	task       *task.Sync
	ticker     *time.Ticker
	stop       chan bool
	uuid       string
	eventsChan chan interface{}
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

	var dir model.DirectionType
	switch conf.Direction {
	case "Bi":
		dir = model.DirectionBi
	case "Left":
		dir = model.DirectionLeft
	case "Right":
		dir = model.DirectionRight
	default:
		return nil, fmt.Errorf("unsupported direction type, please use one of Bi, Left, Right")
	}
	taskUuid := conf.Uuid
	syncTask := task.NewSync(context.Background(), leftEndpoint, rightEndpoint, dir)
	eventsChan := make(chan interface{})
	syncTask.SetSyncEventsChan(eventsChan)
	return &Syncer{
		uuid:       taskUuid,
		task:       syncTask,
		eventsChan: eventsChan,
		stop:       make(chan bool, 1),
	}, nil

}

func (s *Syncer) Serve() {

	ctx := servicecontext.WithServiceName(context.Background(), "sync-task")
	ctx = servicecontext.WithServiceColor(ctx, servicecontext.ServiceColorGrpc)

	log.Logger(ctx).Info("Starting Sync Service")
	s.task.SetSnapshotFactory(endpoint.NewSnapshotFactory(s.uuid))
	s.task.Start(ctx)
	bus := GetBus()
	topic := bus.Sub(TopicSyncAll, TopicSync_+s.uuid)
	s.ticker = time.NewTicker(10 * time.Minute)

	for {
		select {

		case e := <-s.eventsChan:

			GetBus().Pub(e, TopicSync_+s.uuid)

		case <-s.stop:

			s.task.Shutdown()
			s.ticker.Stop()
			close(s.eventsChan)
			log.Logger(ctx).Info("Stopping Service")
			return

		case <-s.ticker.C:

			s.task.Resync(ctx, false, false, nil, nil)

		case message := <-topic:

			switch message {
			case MessageResync:
				s.task.Resync(ctx, false, true, nil, nil)
			case MessageResyncDry:
				s.task.Resync(ctx, true, true, nil, nil)
			case MessageSyncLoop:
				s.task.Resync(ctx, false, false, nil, nil)
			case model.WatchDisconnected:
				log.Logger(ctx).Info("Currently disconnected")
			case model.WatchConnected:
				log.Logger(ctx).Info("Connected, launching a sync loop")
				s.task.Resync(ctx, false, false, nil, nil)
			case MessagePause:
				s.task.Pause()
			case MessageResume:
				s.task.Resume()
				s.task.Resync(ctx, false, false, nil, nil)
			}

		}
	}

}

func (s *Syncer) Stop() {
	s.stop <- true
}
