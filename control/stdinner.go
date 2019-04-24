package control

import (
	"bufio"
	"context"
	"os"

	"github.com/pydio/cells/common/log"
	servicecontext "github.com/pydio/cells/common/service/context"
)

type StdInner struct {
	ctx context.Context
}

func (s *StdInner) Serve() {

	s.ctx = servicecontext.WithServiceName(context.Background(), "scanner")
	s.ctx = servicecontext.WithServiceColor(s.ctx, servicecontext.ServiceColorOther)

	log.Logger(s.ctx).Info("Use 'quit' or Ctrl+C to exit, type 'resync', 'dry', 'loop' to control syncs, 'pause' or 'resume'")
	bus := GetBus()
	scanner := bufio.NewScanner(os.Stdin)
	for scanner.Scan() {
		text := scanner.Text()
		switch text {
		case "exit", "quit":
			// Stop all
			bus.Pub(MessageHalt, TopicGlobal)
		case "resync":
			// Check Snapshot
			// Use dryRun as Force Resync
			bus.Pub(MessageResync, TopicSyncAll)
		case "dry":
			// Check Snapshot
			// Use dryRun as Force Resync
			bus.Pub(MessageResyncDry, TopicSyncAll)
		case "loop":
			// Check Snapshot
			// Use dryRun as Force Resync
			bus.Pub(MessageSyncLoop, TopicSyncAll)
		case "pause":
			// Pause all syncs
			bus.Pub(MessagePause, TopicSyncAll)
		case "resume":
			// Resume all syncs
			bus.Pub(MessageResume, TopicSyncAll)
		}
	}

}

func (s *StdInner) Stop() {
	log.Logger(s.ctx).Info("Stopping StdIn Scanner")
}
