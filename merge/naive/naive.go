package naive

import (
	"log"

	"github.com/pkg/errors"
	"github.com/thejerf/suture"

	"github.com/pydio/poc/sync/common"
	"github.com/pydio/sync"
	"github.com/pydio/sync/merge"
)

// naive merge strategy does not attempt to resolve conflicts and exhibits *NO*
// safety.  DO NOT USE IN PRODUCTION.
// Implements merger.TwoWay
type naive struct {
	*suture.Supervisor
	chHalt chan struct{}
	targ   []sync.Target
}

// implement merger.TwoWay
func (n naive) Left() sync.Target  { return n.targ[0] }
func (n naive) Right() sync.Target { return n.targ[1] }

func (n *naive) init() {
	n.chHalt = make(chan struct{})
}

func (n *naive) applyBatch(e sync.Endpoint, b sync.Batch) {
	for _, ev := range b {
		var err error

		// ev.PathSyncSource.LoadNode(path, leaf)

		switch ev.Type {
		case common.EventCreate:
			log.Printf("[ CREATE ] %s", ev.Path)
			if err = e.CreateNode(ev.ScanSourceNode, false); err != nil {
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

func (n *naive) Serve() {
	n.init()

	go func() {
		for {
			select {
			case b := <-n.Left().Batches():
				n.applyBatch(n.Right(), b)
			case b := <-n.Right().Batches():
				n.applyBatch(n.Left(), b)
			case <-n.chHalt:
				return
			}
		}
	}()

	log.Println("[ DEBUG ] starting naive merge strategy")
	n.Supervisor.Serve()
}

func (n *naive) Stop() {
	defer close(n.chHalt)
	log.Println("[ WARN ] stopping naive merge strategy")
	n.Supervisor.Stop()
}

func (n *naive) Merge(targ ...sync.Target) {
	for _, t := range targ {
		if len(n.targ) > 2 {
			panic(errors.New("too many targets"))
		}
		n.targ = append(n.targ, t)
		n.Add(t)
	}
}

// New two-way merge strategy
func New() merge.TwoWay {
	return &naive{
		Supervisor: suture.NewSimple(""),
		targ:       make([]sync.Target, 0),
		chHalt:     make(chan struct{}),
	}
}
