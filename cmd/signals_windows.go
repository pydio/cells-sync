package cmd

import (
	"os"
	"os/signal"
	"syscall"

	"github.com/pydio/cells-sync/control"
)

func handleSignals() {
	c := make(chan os.Signal, 1)
	signal.Notify(c, syscall.SIGINT, syscall.SIGHUP)

	go func() {

		for sig := range c {
			switch sig {
			case syscall.SIGINT:

				control.GetBus().Pub(control.MessageHalt, control.TopicGlobal)

			case syscall.SIGHUP:
				// Restart all sync
				control.GetBus().Pub(control.MessageRestart, control.TopicGlobal)

			}
		}
	}()
}
