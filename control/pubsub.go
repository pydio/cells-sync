package control

import "github.com/cskr/pubsub"

var (
	bus *pubsub.PubSub
)

const (
	TopicGlobal  = "cmd"
	TopicSyncAll = "sync"
	TopicSync_   = "sync-"
)

type CommandMessage int

const (
	MessageHalt = iota
	MessageRestart
	MessagePause
	MessageResume
	MessageSyncLoop
	MessageResync
	MessageResyncDry
)

func init() {
	bus = pubsub.New(0)
}

func GetBus() *pubsub.PubSub {
	return bus
}
