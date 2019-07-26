// +build app

package cmd

import (
	"os"

	"github.com/spf13/cobra"
)

var RootCmd = &cobra.Command{
	Use:   os.Args[0],
	Short: "Cells Sync Desktop Client",
	Long:  `Opens system tray by default`,
	PersistentPreRun: func(cmd *cobra.Command, args []string) {
		handleSignals()
	},
	Run: func(cmd *cobra.Command, args []string) {
		SystrayCmd.Run(cmd, args)
	},
}
