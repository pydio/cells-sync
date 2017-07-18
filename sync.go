package sync

import (
	"github.com/pydio/services/common/proto/tree"
	"github.com/thejerf/suture"
)

// Event ...
type Event struct {
	Path string
}

// Batch of Events
type Batch []Event

// Batcher takes individual events and batches them
type Batcher interface {
	NextBatch() Batch
}

// MergeStrategy implements a merge algorithm
type MergeStrategy interface{}

// Endpoint is a synchronizable storage backend
type Endpoint interface {
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
