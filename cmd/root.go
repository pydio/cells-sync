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
	"strings"

	"github.com/pydio/cells/common"
	servicecontext "github.com/pydio/cells/common/service/context"
	"go.uber.org/zap/buffer"
	"go.uber.org/zap/zapcore"

	"github.com/pydio/cells/common/log"

	"github.com/spf13/cobra"
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
		log.RegisterConsoleNamedColor("supervisor", servicecontext.ServiceColorRest)
		log.RegisterConsoleNamedColor("oidc", servicecontext.ServiceColorRest)
		log.RegisterConsoleNamedColor("http-server", servicecontext.ServiceColorRest)
		log.RegisterConsoleNamedColor("scheduler", servicecontext.ServiceColorRest)
		log.RegisterConsoleNamedColor("update.service", servicecontext.ServiceColorRest)
		log.RegisterConsoleNamedColor("sync-task", servicecontext.ServiceColorGrpc)
		log.SetSkipServerSync()
		log.Init()

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

func newColorConsoleEncoder(config zapcore.EncoderConfig) zapcore.Encoder {
	return &colorConsoleEncoder{Encoder: zapcore.NewConsoleEncoder(config)}
}

// Custom Encoder to skip some specific fields and colorize logger name
type colorConsoleEncoder struct {
	zapcore.Encoder
}

func (c *colorConsoleEncoder) Clone() zapcore.Encoder {
	return &colorConsoleEncoder{Encoder: c.Encoder.Clone()}
}

func (c *colorConsoleEncoder) EncodeEntry(e zapcore.Entry, ff []zapcore.Field) (*buffer.Buffer, error) {
	color := servicecontext.ServiceColorOther
	if strings.HasPrefix(e.LoggerName, common.ServiceGrpcNamespace_) {
		color = servicecontext.ServiceColorGrpc
	} else if strings.HasPrefix(e.LoggerName, common.ServiceRestNamespace_) {
		color = servicecontext.ServiceColorRest
	}
	e.LoggerName = fmt.Sprintf("\x1b[%dm%s\x1b[0m", color, e.LoggerName)
	return c.Encoder.EncodeEntry(e, ff)
}
