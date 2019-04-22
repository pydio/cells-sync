package cmd

import (
	"os"
	"os/signal"
	"syscall"

	"github.com/spf13/cobra"

	"github.com/pydio/sync/control"
)

var RootCmd = &cobra.Command{
	Use:   os.Args[0],
	Short: "Cells Sync desktop client",
	Long:  `Cells Sync Desktop Client`,
	PersistentPreRun: func(cmd *cobra.Command, args []string) {
		handleSignals()
	},
	Run: func(cmd *cobra.Command, args []string) {
		cmd.Usage()
	},
}

func handleSignals() {
	c := make(chan os.Signal, 1)
	signal.Notify(c, syscall.SIGINT, syscall.SIGHUP)

	go func() {

		for sig := range c {
			switch sig {
			case syscall.SIGINT:

				control.GetBus().Pub(control.MessageHalt, control.TopicGlobal)
				//<-time.After(2 * time.Second)
				//os.Exit(0)

			case syscall.SIGHUP:
				// Restart all sync
				control.GetBus().Pub(control.MessageRestart, control.TopicGlobal)

			}
		}
	}()
}
