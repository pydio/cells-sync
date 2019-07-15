package cmd

import (
	"os"
	"path/filepath"

	"github.com/spf13/cobra"
	"go.uber.org/zap/zapcore"
	"gopkg.in/natefinch/lumberjack.v2"

	"github.com/pydio/cells/common/log"
	"github.com/pydio/sync/config"
	"github.com/pydio/sync/control"
)

var StartCmd = &cobra.Command{
	Use:   "start",
	Short: "Start sync tasks",
	Run: func(cmd *cobra.Command, args []string) {

		logs := config.Default().Logs
		os.MkdirAll(logs.Folder, 0755)
		log.RegisterWriteSyncer(zapcore.AddSync(&lumberjack.Logger{
			Filename:   filepath.Join(logs.Folder, "sync.log"),
			MaxAge:     logs.MaxAgeDays,   // days
			MaxSize:    logs.MaxFilesSize, // megabytes
			MaxBackups: logs.MaxFilesNumber,
		}))

		s := control.NewSupervisor()
		s.Serve()

	},
}

func init() {
	RootCmd.AddCommand(StartCmd)
}
