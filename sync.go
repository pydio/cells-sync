package sync

import "github.com/thejerf/suture"

type Event struct{}

type Batch []Event

type MergeStrategy interface{}

type Target interface {
	suture.Service // start & stop the filter
	NextBatch() Batch
}

// Job is a synchronization job that can be run in the foreground or background
type Job interface {
	suture.Service
	ServeBackground()
}

type merger struct {
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

	return &merger{
		Supervisor:    sup,
		MergeStrategy: s,
		t:             t,
	}
}
