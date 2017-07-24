package naive

import (
	"log"

	"github.com/pkg/errors"
	"github.com/pydio/poc/sync/common"
	"github.com/pydio/sync"
	"github.com/thejerf/suture"
)

type twoWay struct {
	*suture.Supervisor
	chHalt chan struct{}
	targ   []sync.Target
}

func (t twoWay) left() sync.Target  { return t.targ[0] }
func (t twoWay) right() sync.Target { return t.targ[1] }

func (t *twoWay) init() {
	t.chHalt = make(chan struct{})
}

func (t *twoWay) applyBatch(e sync.Endpoint, b sync.Batch) {
	for _, ev := range b {
		var err error

		// ev.PathSyncSource.LoadNode(path, leaf)

		switch ev.Type {
		case common.EventCreate:
			log.Printf("[ CREATE ] %s", ev.Path)
			if err = e.CreateNode(ev.ScanSourceNode); err != nil {
				err = errors.Wrapf(err, "error creating node %s", ev.Path)
			}
		case common.EventRemove:
			log.Printf("[ DELETE ] %s", ev.Path)
			if err = e.DeleteNode(ev.Path); err != nil {
				err = errors.Wrapf(err, "error deleting node %s", ev.Path)
			}
		case common.EventRename:
			log.Printf("[ RENAME ] %s", ev.Path)
			if err = e.UpdateNode(ev.ScanSourceNode); err != nil {
				err = errors.Wrapf(err, "error updating node %s", ev.Path)
			}
		default:
			err = errors.Errorf("invalid event type %s", ev.Type)
		}

		if err != nil {
			// TODO : replace with centralized, structured logging
			log.Printf("[ ERROR ] %s", err)
		}
	}
}

func (t *twoWay) Serve() {
	t.init()
	t.Supervisor.ServeBackground()

	for {
		select {
		case b := <-t.left().Batches():
			t.applyBatch(t.right(), b)
		case b := <-t.right().Batches():
			t.applyBatch(t.left(), b)
		case <-t.chHalt:
			return
		}
	}
}

func (t *twoWay) Stop() {
	defer close(t.chHalt)
	t.Supervisor.Stop()
}

func (t *twoWay) Merge(targ sync.Target) {
	if len(t.targ) >= 2 {
		panic(errors.New("too many targets"))
	}
	t.targ = append(t.targ, targ)
}

// New two-way merge strategy
func New() sync.MergeStrategy {
	return &twoWay{
		Supervisor: suture.NewSimple(""),
		targ:       make([]sync.Target, 2),
		chHalt:     make(chan struct{}),
	}
}
