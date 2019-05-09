package cmd

import (
	"github.com/pydio/sync/control"
	"github.com/spf13/cobra"
)

var StartCmd = &cobra.Command{
	Use:   "start",
	Short: "Start sync tasks",
	Run: func(cmd *cobra.Command, args []string) {

		s := control.NewSupervisor()
		s.Serve()

	},
}

func init() {
	RootCmd.AddCommand(StartCmd)
}
