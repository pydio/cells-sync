package merge

import "github.com/pydio/sync"

// Package merge implements high-level primitives for implementing
// `sync.MergeStrategy`s

// TwoWay merger synchronizes exactly two targets
type TwoWay interface {
	sync.MergeStrategy
	Left() sync.Target
	Right() sync.Target
}
