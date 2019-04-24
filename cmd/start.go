package cmd

import (
	"fmt"
	"log"

	"github.com/pydio/sync/config"

	"github.com/pydio/sync/control"
	"github.com/spf13/cobra"
	"github.com/thejerf/suture"
)

var StartCmd = &cobra.Command{
	Use:   "start",
	Short: "Start sync tasks",
	Run: func(cmd *cobra.Command, args []string) {

		supervisor := suture.NewSimple("cells-sync")

		conf := config.Default()
		if len(conf.Tasks) > 0 {
			for _, t := range conf.Tasks {
				fmt.Println("Starting Sync", t)
				syncer, e := control.NewSyncer(t)
				if e != nil {
					cmd.Usage()
					log.Fatal(e)
				}
				supervisor.Add(syncer)
			}
		}

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
}
