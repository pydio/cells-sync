package twoway

import (
	"github.com/pkg/errors"
	"github.com/pydio/sync"
)

type twoWay struct {
	targ []sync.Target
}

func (t twoWay) left() sync.Target  { return t.targ[0] }
func (t twoWay) right() sync.Target { return t.targ[1] }

func (t twoWay) Serve() { panic("NOT IMPLEMENTED") }
func (t twoWay) Stop()  { panic("NOT IMPLEMENTED") }

func (t *twoWay) Merge(targ sync.Target) {
	if len(t.targ) >= 2 {
		panic(errors.New("too many targets"))
	}
	t.targ = append(t.targ, targ)

	// TODO : pull in batches from left/right & cross the streams
}

// New two-way merge strategy
func New() sync.MergeStrategy {
	return &twoWay{}
}
