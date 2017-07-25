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
	Batches() <-chan Batch
}

// MergeStrategy implements a merge algorithm
type MergeStrategy interface {
	suture.Service
	Merge(...Target)
}

// Endpoint is a synchronizable storage backend
type Endpoint interface {

	// TODO : move common.WatchObject into sync repo.  This will be a good time
	// to refactor watch behavior at the client level and implement a sensible
	// [structured] logging strategy.
	Watch(string) (*common.WatchObject, error)

	CreateNode(*tree.Node, bool) error
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
