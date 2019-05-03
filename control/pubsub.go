package control

import (
	"fmt"

	"github.com/cskr/pubsub"
)

var (
	bus *pubsub.PubSub
)

const (
	TopicGlobal  = "cmd"
	TopicSyncAll = "sync"
	TopicSync_   = "sync-"
	TopicState   = "state"
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
	MessagePublishState
)

func init() {
	bus = pubsub.New(0)
}

func GetBus() *pubsub.PubSub {
	return bus
}

func MessageFromString(text string) (int, error) {

	switch text {
	case "exit", "quit":
		// Stop all
		return MessageHalt, nil
	case "resync":
		// Check Snapshot
		// Use dryRun as Force Resync
		return MessageResync, nil
	case "dry":
		// Check Snapshot
		// Use dryRun as Force Resync
		return MessageResyncDry, nil
	case "loop":
		// Check Snapshot
		// Use dryRun as Force Resync
		return MessageSyncLoop, nil
	case "pause":
		// Pause all syncs
		return MessagePause, nil
	case "resume":
		// Resume all syncs
		return MessageResume, nil
	default:
		return -1, fmt.Errorf("cannot find corresponding command")
	}

}
