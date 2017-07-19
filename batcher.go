package sync

import "time"

const (
	maxBatchSize = 1024
	maxBatchWait = time.Millisecond * 1000
)

type batcher struct {
	chHalt chan struct{}

	chEvIn      chan Event
	chBtchOut   chan Batch
	chBtchReady chan Batch

	nextBatch Batch
}

func (b batcher) NextBatch() Batch {
	return <-b.chBtchOut
}

func (b batcher) RecvEvent(ev Event) {
	b.chEvIn <- ev
}

func (b *batcher) init() {
	b.chHalt = make(chan struct{})
	b.chEvIn = make(chan Event)
	b.chBtchReady = make(chan Batch)
	b.initBatch()
}

func (b *batcher) initBatch() { b.nextBatch = make([]Event, 0) }

func (b *batcher) enqueueEvent(ev Event) {
	if b.nextBatch = append(b.nextBatch, ev); len(b.nextBatch) == maxBatchSize {
		b.chBtchReady <- b.commitBatch()
	}
}

func (b *batcher) commitBatch() (bOut Batch) {
	bOut = b.nextBatch
	b.initBatch()
	return
}

func (b *batcher) Serve() {
	defer close(b.chBtchOut)
	defer close(b.chBtchReady)
	defer close(b.chEvIn)

	for {
		select {
		case ev := <-b.chEvIn:
			b.enqueueEvent(ev)
		case btch := <-b.chBtchReady:
			b.chBtchOut <- btch
		case <-time.After(maxBatchWait):
			b.chBtchOut <- b.commitBatch()
		case <-b.chHalt:
			return
		}
	}
}
func (b batcher) Stop() { close(b.chHalt) }
