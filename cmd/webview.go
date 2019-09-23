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
	"github.com/skratchdot/open-golang/open"
	"github.com/spf13/cobra"
	"github.com/zserge/webview"
)

var url string

type LinkOpener struct{}

func (w *LinkOpener) Open(url string) {
	open.Run(url)
}

var WebviewCmd = &cobra.Command{
	Use:   "webview",
	Short: "Launch WebView",
	Run: func(cmd *cobra.Command, args []string) {
		w := webview.New(webview.Settings{
			Width:     900,
			Height:    600,
			Resizable: true,
			Title:     "Cells Sync",
			URL:       url,
			Debug:     true, // Enable JS Debugger
		})
		w.Dispatch(func() {
			w.Bind("linkOpener", &LinkOpener{})
		})
		w.Run()
	},
}

func init() {
	WebviewCmd.PersistentFlags().StringVar(&url, "url", "http://localhost:3636", "Open webview")

	RootCmd.AddCommand(WebviewCmd)
}
