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

	log.Logger(s.ctx).Info("Type 'exit' and enter or Ctrl+C to quit, type 'resync' and enter to launch a resync.")
	bus := GetBus()
	scanner := bufio.NewScanner(os.Stdin)
	for scanner.Scan() {
		text := scanner.Text()
		switch text {
		case "exit":
			bus.Pub(MessageHalt, TopicGlobal)
		case "resync":
			// Check Snapshot
			// Use dryRun as Force Resync
			bus.Pub(MessageResync, TopicSyncAll)
		case "dry":
			// Check Snapshot
			// Use dryRun as Force Resync
			bus.Pub(MessageResyncDry, TopicSyncAll)
		}
	}

}

func (s *StdInner) Stop() {
	log.Logger(s.ctx).Info("Stopping StdIn Scanner")
}
