/*
 * Copyright (c) 2019. Abstrium SAS <team (at) pydio.com>
 * This file is part of Pydio Cells.
 *
 * Pydio Cells is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Pydio Cells is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Pydio Cells.  If not, see <http://www.gnu.org/licenses/>.
 *
 * The latest code can be found at <https://pydio.com>.
 */

package main

import (
	"context"
	"fmt"
	"os"
	"os/exec"

	"github.com/getlantern/systray"
	"github.com/skratchdot/open-golang/open"
	"github.com/zserge/webview"

	"github.com/pydio/sync/app/systray/icon"
	"github.com/pydio/sync/common"
)

var (
	viewCancel context.CancelFunc
	cliCancel  context.CancelFunc
	uxUrl      = "http://localhost:3636"
	closing    bool
)

type WebviewLinkOpener struct{}

func (w *WebviewLinkOpener) Open(url string) {
	open.Run(url)
}

func main() {
	var arg1 string
	if len(os.Args) > 1 {
		arg1 = os.Args[1]
	}
	switch arg1 {
	case "version":
		common.PrintVersion("Cells Sync System Tray")
		os.Exit(0)
	case "webview":
		if len(os.Args) > 2 {
			uxUrl = os.Args[2]
		}
		w := webview.New(webview.Settings{
			Height:    600,
			Width:     800,
			Resizable: true,
			Title:     "Cells Sync",
			URL:       uxUrl,
			Debug:     true, // Enable JS Debugger
		})
		w.Dispatch(func() {
			w.Bind("linkOpener", &WebviewLinkOpener{})
		})
		w.Run()
	default:
		go startCli()
		// Should be called at the very beginning of main().
		systray.Run(onReady, onExit)
	}
}

func startCli() {
	c, cancel := context.WithCancel(context.Background())
	cmd := exec.CommandContext(c, processName("sync-cli"), "start")
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cliCancel = cancel
	if e := cmd.Run(); e != nil {
		cliCancel = nil
	}
}

func spawnWebView() {
	c, cancel := context.WithCancel(context.Background())
	cmd := exec.CommandContext(c, processName(os.Args[0]), "webview", uxUrl)
	viewCancel = cancel
	if e := cmd.Run(); e != nil {
		if !closing {
			fmt.Println("Error while starting WebView - Opening in browser instead", e)
			open.Run(uxUrl)
		}
	}
	// Clear cancel after Run finish
	viewCancel = nil
}

func onReady() {
	systray.SetIcon(icon.Data)
	systray.SetTitle("Cells")
	systray.SetTooltip("Cells Sync Client")
	mOpen := systray.AddMenuItem("Open", "Open Sync UX")
	systray.AddSeparator()
	mQuit := systray.AddMenuItem("Quit", "Exit Sync")

	// We can manipulate the systray in other goroutines
	go func() {
		for {
			select {
			case <-mOpen.ClickedCh:
				go spawnWebView()
			case <-mQuit.ClickedCh:
				beforeExit()
				systray.Quit()
				fmt.Println("Quitting now...")
				return
			}
		}
	}()
}

func beforeExit() {
	closing = true
	if viewCancel != nil {
		viewCancel()
		viewCancel = nil
	}
	if cliCancel != nil {
		cliCancel()
		cliCancel = nil
	}
}

func onExit() {
	fmt.Println("OnExit")
}
