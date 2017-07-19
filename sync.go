package sync

import (
	"github.com/pydio/poc/sync/common"
	"github.com/pydio/services/common/proto/tree"
	"github.com/thejerf/suture"
)

// Batch of Events
type Batch []common.EventInfo

// Batcher takes individual events and batches them
type Batcher interface {
	NextBatch() Batch
}

// MergeStrategy implements a merge algorithm
type MergeStrategy interface{}

// Endpoint is a synchronizable storage backend
type Endpoint interface {

	// TODO : move common.WatchObject into sync repo.  This will be a good time
	// to refactor watch behavior at the client level and implement a sensible
	// [structured] logging strategy.
	Watch(string) (*common.WatchObject, error)

	CreateNode(*tree.Node) error
	UpdateNode(*tree.Node) error

	LoadNode(string, ...bool) (*tree.Node, error) // TODO : understand the `leaf` bools
	DeleteNode(string) error
	MoveNode(src string, dst string) error
}

// Target for synchronization
type Target interface {
	suture.Service // start & stop the filter
	Batcher
	Endpoint
}

// Job is a synchronization job that can be run in the foreground or background
type Job interface {
	suture.Service
	ServeBackground()
}

type job struct {
	*suture.Supervisor
	MergeStrategy
	t []Target
}

// New sync job
func New(s MergeStrategy, t ...Target) Job {
	sup := suture.NewSimple("")
	for _, svc := range t {
		sup.Add(svc)
	}

	return &job{
		Supervisor:    sup,
		MergeStrategy: s,
		t:             t,
	}
}
