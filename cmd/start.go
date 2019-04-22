package cmd

import (
	"log"

	"github.com/pydio/sync/control"
	"github.com/spf13/cobra"
	"github.com/thejerf/suture"
)

var (
	left      string
	right     string
	direction string
)

var StartCmd = &cobra.Command{
	Use:   "start",
	Short: "Start sync",
	Run: func(cmd *cobra.Command, args []string) {

		supervisor := suture.NewSimple("cells-sync")

		syncer, e := control.NewSyncer(left, right, direction)
		if e != nil {
			cmd.Usage()
			log.Fatal(e)
		}
		supervisor.Add(syncer)

		profiler := &control.Profiler{}
		supervisor.Add(profiler)
		scanner := &control.StdInner{}
		supervisor.Add(scanner)

		c := control.GetBus().Sub(control.TopicGlobal)
		go func() {
			for m := range c {
				if m == control.MessageHalt {
					supervisor.Stop()
				}
			}
		}()

		supervisor.Serve()

	},
}

func init() {
	RootCmd.AddCommand(StartCmd)
	flags := StartCmd.Flags()
	flags.StringVarP(&left, "left", "l", "", "Left endpoint URI")
	flags.StringVarP(&right, "right", "r", "", "Right endpoint URI")
	flags.StringVarP(&direction, "direction", "d", "bi", "Sync direction")
}
