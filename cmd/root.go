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

// Package cmd registers cobra commands for CLI tool. Some commands use an "app" build tag
// to speed up compilation while developing by ignoring UX specific dependencies (systray, webview)
package cmd

import (
	"fmt"
	"os"
	"runtime"

	"github.com/spf13/cobra"

	"github.com/pydio/cells-sync/config"
	"github.com/pydio/cells/common/log"
)

// RootCmd is the Cobra root command
var RootCmd = &cobra.Command{
	Use:   os.Args[0],
	Short: "Cells Sync desktop client",
	Long: `Cells Sync desktop client.

Realtime, bidirectional synchronization tool for Pydio Cells server. 
Launching without command is the same as './cells-sync start' on Mac and Windows. 
`,
	PersistentPreRun: func(cmd *cobra.Command, args []string) {
		// Init logger
		log.RegisterConsoleNamedColor("supervisor", log.ConsoleColorRest)
		log.RegisterConsoleNamedColor("oidc", log.ConsoleColorRest)
		log.RegisterConsoleNamedColor("http-server", log.ConsoleColorRest)
		log.RegisterConsoleNamedColor("scheduler", log.ConsoleColorRest)
		log.RegisterConsoleNamedColor("update.service", log.ConsoleColorRest)
		log.RegisterConsoleNamedColor("sync-task", log.ConsoleColorGrpc)
		log.SetSkipServerSync()
		logDir, e := config.GetLogsDir()
		if e != nil {
			fmt.Println("Cannot create log dir, sending logs to current folder")
			logDir = "./"
		}
		log.Init(logDir)

		handleSignals()
	},
	Run: func(cmd *cobra.Command, args []string) {
		if runtime.GOOS == "windows" || runtime.GOOS == "darwin" {
			StartCmd.PreRun(cmd, args)
			StartCmd.Run(cmd, args)
		} else {
			cmd.Usage()
		}
	},
}
