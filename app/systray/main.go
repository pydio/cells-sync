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

	"github.com/pydio/cells/common/sync/model"

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
	ws         *Client
	stateSlots []*systray.MenuItem
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
			Width:     779,
			Height:    536,
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

func spawnWebView(path ...string) {
	c, cancel := context.WithCancel(context.Background())
	url := uxUrl
	if len(path) > 0 {
		url += path[0]
	}
	cmd := exec.CommandContext(c, processName(os.Args[0]), "webview", url)
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
	systray.SetTitle("Starting")
	systray.SetTooltip("Cells Sync Client")
	mOpen := systray.AddMenuItem("Open Interface", "Open Sync UX")
	mOpen.Disable()
	systray.AddSeparator()
	// Prepare slots for tasks
	for i := 0; i < 10; i++ {
		slot := systray.AddMenuItem("", "")
		slot.Hide()
		stateSlots = append(stateSlots, slot)
	}
	mNewTasks := systray.AddMenuItem("Create new task...", "")
	systray.AddSeparator()
	mAbout := systray.AddMenuItem("About", "About Cells Sync")
	mQuit := systray.AddMenuItem("Quit", "Exit Sync")
	ws = NewClient()

	// We can manipulate the systray in other goroutines
	go func() {
		for {
			select {
			case s := <-ws.Status:
				fmt.Println("Read Status Chan", s)
				if s == StatusConnected {
					systray.SetTitle("Cells")
					mOpen.Enable()
					mNewTasks.Enable()
					for _, slot := range stateSlots {
						slot.Disable()
					}
				} else {
					systray.SetTitle("Cells (!)")
					mOpen.Disable()
					mNewTasks.Disable()
					for _, slot := range stateSlots {
						slot.Enable()
					}
				}
			case tasks := <-ws.Tasks:
				i := 0
				for _, t := range tasks {
					label := t.Config.Label
					switch t.Status {
					case model.TaskStatusDisabled:
						label += " (disabled)"
					case model.TaskStatusProcessing:
						label += " (syncing)"
					case model.TaskStatusPaused:
						label += " (paused)"
					case model.TaskStatusError:
						label += " (error!)"
					}
					stateSlots[i].SetTitle(label)
					stateSlots[i].SetTooltip(t.Config.Uuid)
					stateSlots[i].Show()
					if mOpen.Disabled() {
						stateSlots[i].Disable()
					} else {
						stateSlots[i].Enable()
					}
					i++
					if i >= len(stateSlots) {
						return
					}
				}
				for k, slot := range stateSlots {
					if k > len(tasks) {
						slot.Hide()
					}
				}
			case e := <-ws.Errors:
				fmt.Println("Errors from client", e)
			case <-mOpen.ClickedCh:
				go spawnWebView()
			case <-mNewTasks.ClickedCh:
				go spawnWebView("/create")
			case <-mAbout.ClickedCh:
				go spawnWebView("/about")
			case <-mQuit.ClickedCh:
				fmt.Println("Quitting now...")
				beforeExit()
				systray.Quit()
				return
			}
		}
	}()

	ws.Connect()
}

func beforeExit() {
	closing = true
	if ws != nil {
		ws.Close()
	}
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
