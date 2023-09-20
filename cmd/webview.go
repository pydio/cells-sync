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
	"github.com/pydio/cells-sync/i18n"
	"github.com/skratchdot/open-golang/open"
	"github.com/spf13/cobra"
	"github.com/webview/webview_go"
)

var url string

// LinkOpener is bound to JS inside the webview
type LinkOpener struct{}

// Open opens an url (http or file) using OS stuff.
func (w *LinkOpener) Open(url string) {
	_ = open.Run(url)
}

// WebviewCmd opens a webview pointing to the http server URL.
var WebviewCmd = &cobra.Command{
	Use:   "webview",
	Short: "Launch WebView",
	Run: func(cmd *cobra.Command, args []string) {
		lang := i18n.JsonLang()
		if lang != "" {
			url += "?lang=" + lang
		}
		w := webview.New(true)
		w.SetTitle(i18n.T("application.title"))
		w.SetSize(900, 600, webview.HintNone)
		_ = w.Bind("linkOpen", func(url string) {
			_ = open.Run(url)
		})
		w.Navigate(url)
		/*
			webview.Settings{
						Width:     900,
						Height:    600,
						Resizable: true,
						Title:     i18n.T("application.title"),
						URL:       url,
						Debug:     true, // Enable JS Debugger
						ExternalInvokeCallback: func(w webview.WebView, data string) {
							switch data {
							case "DOMContentLoaded":
								w.Bind("linkOpener", &LinkOpener{})
								break
							}
						},
					}
		*/

		w.Run()
	},
}

func init() {
	WebviewCmd.PersistentFlags().StringVar(&url, "url", "http://localhost:3636", "Web server URL")

	RootCmd.AddCommand(WebviewCmd)
}
