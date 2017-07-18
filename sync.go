package sync

type Event struct{}

type Batch []Event

type MergeStrategy interface{}

type Target interface {
	NextBatch() Batch
}

type Merger struct {
	MergeStrategy
	T []Target
}

func (m Merger) Serve() {}
func (m Merger) Stop()  {}
