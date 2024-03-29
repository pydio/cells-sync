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
	"os"
	"path/filepath"

	"github.com/spf13/cobra"
	"go.uber.org/zap/zapcore"
	"gopkg.in/natefinch/lumberjack.v2"

	"github.com/pydio/cells-sync/config"
	"github.com/pydio/cells/v4/common/log"
)

// StartCmd starts the client.
var BgStartCmd = &cobra.Command{
	Use:   "bgstart",
	Short: "Start sync tasks from within service",
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
		config.SetMacService(true)
		s, err := config.GetAppService(runner)
		if err != nil {
			log.Fatal(err.Error())
			return
		}
		l, err := s.Logger(nil)
		if err != nil {
			log.Fatal(err.Error())
			return
		}
		err = s.Run()
		if err != nil {
			l.Error(err)
		}
	},
}

func init() {
	RootCmd.AddCommand(BgStartCmd)
}
