package cmd

import (
	"context"
	"fmt"
	"os"

	"github.com/spf13/cobra"
	"github.com/thejerf/suture"

	"github.com/pydio/cells/common/log"
	"github.com/pydio/cells/common/service/context"
	"github.com/pydio/sync/config"
	"github.com/pydio/sync/control"
)

var StartCmd = &cobra.Command{
	Use:   "start",
	Short: "Start sync tasks",
	Run: func(cmd *cobra.Command, args []string) {

		ctx := servicecontext.WithServiceName(context.Background(), "supervisor")
		ctx = servicecontext.WithServiceColor(ctx, servicecontext.ServiceColorRest)

		supervisor := suture.New("cells-sync", suture.Spec{
			Log: func(s string) {
				log.Logger(ctx).Info(s)
			},
		})

		conf := config.Default()
		if len(conf.Tasks) > 0 {
			for _, t := range conf.Tasks {
				fmt.Println("Starting Sync", t)
				syncer, e := control.NewSyncer(t)
				if e != nil {
					log.Logger(ctx).Error(e.Error())
					cmd.Usage()
					os.Exit(1)
				}
				supervisor.Add(syncer)
			}
		}

		profiler := &control.Profiler{}
		supervisor.Add(profiler)
		scanner := &control.StdInner{}
		supervisor.Add(scanner)
		httpServer := &control.HttpServer{}
		supervisor.Add(httpServer)

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
