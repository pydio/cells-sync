package control

import (
	"context"
	"fmt"
	"time"

	"github.com/pborman/uuid"

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

func NewSyncer(left, right, direction string) (*Syncer, error) {
	parseMessage := "invalid arguments: please provide left and right endpoints using a valid URI"
	if left == "" || right == "" {
		return nil, fmt.Errorf(parseMessage)
	}
	leftEndpoint, err := endpoint.EndpointFromURI(left, right)
	if err != nil {
		return nil, errors.Wrap(err, parseMessage)
	}
	rightEndpoint, err := endpoint.EndpointFromURI(right, left)
	if err != nil {
		return nil, errors.Wrap(err, parseMessage)
	}

	var dir model.DirectionType
	switch direction {
	case "bi":
		dir = model.DirectionBi
	case "left":
		dir = model.DirectionLeft
	case "right":
		dir = model.DirectionRight
	default:
		return nil, fmt.Errorf("unsupported direction type, please use one of bi, left, right")
	}
	taskUuid := uuid.New()
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
	s.task.SetSnapshotFactory(endpoint.NewSnapshotFactory())
	s.task.Start(ctx)
	//s.task.Resync(ctx, false, false, nil, nil)
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

			if message == MessageResync {
				s.task.Resync(ctx, false, true, nil, nil)
			} else if message == MessageResyncDry {
				s.task.Resync(ctx, true, true, nil, nil)
			} else if message == MessageSyncLoop {
				s.task.Resync(ctx, false, false, nil, nil)
			} else if message == model.WatchDisconnected {
				log.Logger(ctx).Info("Currently disconnected")
			} else if message == model.WatchConnected {
				log.Logger(ctx).Info("Connected, launching a sync loop")
				s.task.Resync(ctx, false, false, nil, nil)
			}

		}
	}

}

func (s *Syncer) Stop() {
	s.stop <- true
}
