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
		if cmd, e := MessageFromString(text); e == nil {
			if cmd == MessageHalt {
				bus.Pub(cmd, TopicGlobal)
			} else {
				bus.Pub(cmd, TopicSyncAll)
			}
		}
	}

}

func (s *StdInner) Stop() {
	log.Logger(s.ctx).Info("Stopping StdIn Scanner")
}
