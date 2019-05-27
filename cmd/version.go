package cmd

import (
	"github.com/pydio/sync/common"
	"github.com/spf13/cobra"
)

var VersionCmd = &cobra.Command{
	Use:   "version",
	Short: "Display version",
	Run: func(cmd *cobra.Command, args []string) {
		common.PrintVersion("Cells Sync")
	},
}

func init() {
	RootCmd.AddCommand(VersionCmd)
}
