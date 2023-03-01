/*
 * Copyright 2019 Abstrium SAS
 *
 *  This file is part of Cells Sync.
 *
 *  Cells Sync is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  Cells Sync is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with Cells Sync.  If not, see <https://www.gnu.org/licenses/>.
 */

package cmd

import (
	"fmt"
	"os"
	"path/filepath"

	"golang.org/x/net/context"

	"github.com/spf13/cobra"
	"go.uber.org/zap/zapcore"
	"gopkg.in/natefinch/lumberjack.v2"

	"github.com/pydio/cells-sync/config"
	"github.com/pydio/cells-sync/control"
	"github.com/pydio/cells/v4/common/log"
)

var (
	startNoUi        bool
	defaultStartNoUi bool
)

func runner() {
	s := control.NewSupervisor(startNoUi)
	s.Serve()
}

// StartCmd starts the client.
var StartCmd = &cobra.Command{
	Use:   "start",
	Short: "Start sync tasks",
	PreRun: func(cmd *cobra.Command, args []string) {
		logs := config.Default().Logs
		os.MkdirAll(logs.Folder, 0755)
		log.RegisterWriteSyncer(zapcore.AddSync(&lumberjack.Logger{
			Filename:   filepath.Join(logs.Folder, "sync.log"),
			MaxAge:     logs.MaxAgeDays,   // days
			MaxSize:    logs.MaxFilesSize, // megabytes
			MaxBackups: logs.MaxFilesNumber,
		}))
	},
	Run: func(cmd *cobra.Command, args []string) {
		if config.ServiceInstalled() {
			log.Logger(context.Background()).Info("Sending service start command")
			config.ControlAppService(config.ServiceCmdStart)
		} else {
			log.Logger(context.Background()).Info(fmt.Sprintf("Starting runner with Parent ID %d", os.Getppid()))
			runner()
		}
	},
}

func init() {
	StartCmd.Flags().BoolVar(&startNoUi, "headless", defaultStartNoUi, "Start sync tasks without UI components")
	RootCmd.AddCommand(StartCmd)
}
