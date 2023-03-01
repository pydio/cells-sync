//go:build !pure

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
	"github.com/pydio/cells-sync/app/tray"
	"github.com/spf13/cobra"
)

// SystrayCmd starts the System Tray
var SystrayCmd = &cobra.Command{
	Use:   "systray",
	Short: "Launch Systray",
	Run: func(cmd *cobra.Command, args []string) {
		tray.Run(url)
	},
}

func init() {
	SystrayCmd.PersistentFlags().StringVar(&url, "url", "http://localhost:3636", "WebServer URL")
	RootCmd.AddCommand(SystrayCmd)
}
