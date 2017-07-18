package sync

import (
	"time"

	"github.com/deckarep/golang-set"
	"github.com/pydio/services/common/proto/tree"
)

const filtDuration = time.Second * 1

// implements Target
type filter struct {
	filt mapset.Set

	Endpoint
	Batcher
}

// NextBatch applies a filter to the underlying Batcher's NextBatch method
func (f filter) NextBatch() (b Batch) {
	for _, ev := range f.Batcher.NextBatch() {
		if f.filt.Contains(ev.Path) {
			continue // Ignore the event
		}

		b = append(b, ev)
	}

	return
}

func (f filter) addToFilter(p string) {
	f.filt.Add(p)
	go func() {
		<-time.After(filtDuration)
		f.filt.Remove(p)
	}()
}

func (f filter) CreateNode(n *tree.Node) error {
	f.addToFilter(n.GetPath())
	return f.Endpoint.CreateNode(n)
}

func (f filter) UpdateNode(n *tree.Node) error {
	f.addToFilter(n.GetPath())
	return f.Endpoint.UpdateNode(n)
}

func (f filter) LoadNode(p string, leaf ...bool) (*tree.Node, error) {
	f.addToFilter(p)
	return f.Endpoint.LoadNode(p, leaf...)
}

func (f filter) DeleteNode(p string) error {
	f.addToFilter(p)
	return f.Endpoint.DeleteNode(p)
}

func (f filter) MoveNode(src string, dst string) error {
	f.addToFilter(src)
	f.addToFilter(dst)
	return f.Endpoint.MoveNode(src, dst)
}

func newTarget(end Endpoint) Target {
	// XXX : NOT IMPLEMENTED
}
