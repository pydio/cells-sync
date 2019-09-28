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

package tray

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"time"

	"github.com/pydio/cells-sync/i18n"

	"github.com/getlantern/systray"
	"github.com/skratchdot/open-golang/open"

	"github.com/pydio/cells-sync/app/tray/icon"
	"github.com/pydio/cells-sync/app/tray/iconactive"
	"github.com/pydio/cells-sync/app/tray/iconactive2"
	"github.com/pydio/cells-sync/app/tray/iconerror"
	"github.com/pydio/cells-sync/common"
	"github.com/pydio/cells-sync/config"
	"github.com/pydio/cells/common/log"
	servicecontext "github.com/pydio/cells/common/service/context"
	"github.com/pydio/cells/common/sync/model"
)

var (
	viewCancel    context.CancelFunc
	uxUrl         = "http://localhost:3636"
	closing       bool
	ws            *Client
	stateSlots    []*systray.MenuItem
	activeToggler bool
	activeDone    chan bool
	trayCtx       = servicecontext.WithServiceColor(servicecontext.WithServiceName(context.Background(), "systray"), servicecontext.ServiceColorOther)
)

func Run(url string) {
	if url != "" {
		uxUrl = url
	}
	systray.Run(onReady, onExit)
}

func spawnWebView(path ...string) {
	if viewCancel != nil {
		// It is already opened - do nothing
		if len(path) > 0 {
			ws.SendRoute(path[0])
		}
		return
	}
	c, cancel := context.WithCancel(context.Background())
	url := uxUrl
	if len(path) > 0 {
		url += path[0]
	}
	cmd := exec.CommandContext(c, config.ProcessName(os.Args[0]), "webview", "--url", url)
	cmd.Stderr = os.Stderr
	cmd.Stdout = os.Stdout
	viewCancel = cancel
	if e := cmd.Run(); e != nil {
		if !closing {
			log.Logger(trayCtx).Error("Error while starting WebView - Opening in browser instead: " + e.Error())
			open.Run(uxUrl)
		}
	}
	// Clear cancel after Run finish
	viewCancel = nil
}

func setIconActive() {
	if activeDone != nil {
		// already active
		return
	}
	activeDone = make(chan bool, 1)
	go func() {
		defer func() {
			activeDone = nil
		}()
		for {
			select {
			case <-time.After(750 * time.Millisecond):
				if !activeToggler {
					systray.SetIcon(iconactive.Data)
				} else {
					systray.SetIcon(iconactive2.Data)
				}
				activeToggler = !activeToggler
			case <-activeDone:
				return
			}
		}
	}()
}

func setIconIdle() {
	if activeDone != nil {
		close(activeDone)
	}
	systray.SetIcon(icon.Data)
}

func setIconError() {
	if activeDone != nil {
		close(activeDone)
	}
	systray.SetIcon(iconerror.Data)
}

func onReady() {
	systray.SetIcon(icon.Data)
	setIconActive()
	systray.SetTitle(i18n.T("tray.title.starting"))
	systray.SetTooltip(i18n.T("application.title"))
	mOpen := systray.AddMenuItem(i18n.T("tray.menu.open"), i18n.T("tray.menu.open.legend"))
	mOpen.Disable()
	systray.AddSeparator()
	// Prepare slots for tasks
	for i := 0; i < 10; i++ {
		slot := systray.AddMenuItem("---", "")
		slot.Hide()
		stateSlots = append(stateSlots, slot)
	}
	mNewTasks := systray.AddMenuItem(i18n.T("main.create"), i18n.T("main.create.legend"))
	systray.AddSeparator()
	mResync := systray.AddMenuItem(i18n.T("main.all.resync"), i18n.T("main.all.resync.legend"))
	mAbout := systray.AddMenuItem(i18n.T("nav.about"), "")
	mQuit := systray.AddMenuItem(i18n.T("tray.menu.exit"), i18n.T("tray.menu.exit.legend"))
	ws = NewClient()

	// We can manipulate the systray in other goroutines
	go func() {
		for {
			select {
			case s := <-ws.Status:
				systray.SetTitle("")
				if s == StatusConnected {
					mOpen.Enable()
					mNewTasks.Enable()
					for _, slot := range stateSlots {
						slot.Disable()
					}
				} else {
					setIconError()
					mOpen.Disable()
					mNewTasks.Disable()
					for _, slot := range stateSlots {
						slot.Enable()
					}
				}
			case tasks := <-ws.Tasks:
				i := 0
				if len(tasks) == 0 {
					setIconIdle()
				}
				log.Logger(trayCtx).Info(fmt.Sprintf("Systray received %d tasks", len(tasks)))
				var hasError bool
				var hasProcessing bool
				for _, t := range tasks {
					label := t.Config.Label
					switch t.Status {
					case model.TaskStatusDisabled:
						label += " (" + i18n.T("tray.task.status.disabled") + ")"
					case model.TaskStatusProcessing:
						label += " (" + i18n.T("tray.task.status.processing") + ")"
						hasProcessing = true
					case model.TaskStatusPaused:
						label += " (" + i18n.T("tray.task.status.paused") + ")"
					case model.TaskStatusError:
						label += " (" + i18n.T("tray.task.status.error") + ")"
						hasError = true
					}
					if !hasError && (!t.LeftInfo.Connected || !t.RightInfo.Connected) {
						label += " (" + i18n.T("tray.task.status.disconnected") + ")"
						hasError = true
					}
					stateSlots[i].SetTitle(label)
					stateSlots[i].SetTooltip(t.Config.Uuid)
					stateSlots[i].Show()
					if mOpen.Disabled() {
						stateSlots[i].Disable()
					} else {
						stateSlots[i].Enable()
					}
					if hasError {
						setIconError()
					} else if hasProcessing {
						setIconActive()
					} else {
						setIconIdle()
					}
					i++
					if i >= len(stateSlots) {
						break
					}
				}
				for k, slot := range stateSlots {
					if k >= len(tasks) {
						slot.Hide()
					}
				}
			case e := <-ws.Errors:
				log.Logger(trayCtx).Error("Received error from client " + e.Error())
			case <-mOpen.ClickedCh:
				go spawnWebView()
			case <-mNewTasks.ClickedCh:
				go spawnWebView("/create")
			case <-mAbout.ClickedCh:
				go spawnWebView("/about")
			case <-stateSlots[0].ClickedCh:
				go spawnWebView("/")
			case <-stateSlots[1].ClickedCh:
				go spawnWebView("/")
			case <-stateSlots[2].ClickedCh:
				go spawnWebView("/")
			case <-stateSlots[3].ClickedCh:
				go spawnWebView("/")
			case <-stateSlots[4].ClickedCh:
				go spawnWebView("/")
			case <-stateSlots[5].ClickedCh:
				go spawnWebView("/")
			case <-stateSlots[6].ClickedCh:
				go spawnWebView("/")
			case <-stateSlots[7].ClickedCh:
				go spawnWebView("/")
			case <-stateSlots[8].ClickedCh:
				go spawnWebView("/")
			case <-stateSlots[9].ClickedCh:
				go spawnWebView("/")
			case <-mResync.ClickedCh:
				ws.SendCmd(&common.CmdContent{Cmd: "loop"})
			case <-mQuit.ClickedCh:
				log.Logger(trayCtx).Info("Closing systray now...")
				ws.SendHalt()
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
}

func onExit() {
	//fmt.Println("OnExit")
}
