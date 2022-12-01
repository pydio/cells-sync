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
	"path/filepath"
	"runtime"
	"sync"
	"time"

	"github.com/skratchdot/open-golang/open"

	"github.com/getlantern/systray"
	"github.com/pydio/cells-sync/common"
	"github.com/pydio/cells-sync/config"
	"github.com/pydio/cells-sync/control"
	"github.com/pydio/cells-sync/i18n"
	"github.com/pydio/cells/v4/common/log"
	servicecontext "github.com/pydio/cells/v4/common/service/context"
	"github.com/pydio/cells/v4/common/sync/model"
)

var (
	viewCancel context.CancelFunc
	uxUrl      = "http://localhost:3636"
	cancelling bool
	ws         *Client
	stateSlots []*systray.MenuItem

	firstRun    bool
	pauseToggle bool
	trayCtx     = servicecontext.WithServiceName(context.Background(), "systray")

	ErrNotSupported = fmt.Errorf("unsupported operating system: %s", runtime.GOOS)
)

// Run opens the system tray
func Run(url string) {
	if url != "" {
		uxUrl = url
	}
	checkFirstRun()
	systray.Run(onReady, onExit)
}

// checkFirstRun looks for a specific file to automatically open the webview at first run.
func checkFirstRun() {
	if _, e := os.Stat(filepath.Join(config.SyncClientDataDir(), "tray-first-run")); e != nil && os.IsNotExist(e) {
		firstRun = true
	}
}

func disableFirstRun() {
	firstRun = false
	_ = os.WriteFile(filepath.Join(config.SyncClientDataDir(), "tray-first-run"), []byte("done"), 0755)
}

func spawnWebView(path ...string) {
	if viewCancel != nil {
		// It is already opened, but probably out of sight. Close and reopen
		viewCancel()
		viewCancel = nil
		<-time.After(200 * time.Millisecond)
		/*
			// Or other option : send a message to change page
				if len(path) > 0 {
					ws.SendRoute(path[0])
				}
				return
		*/
	}
	c, cancel := context.WithCancel(context.Background())
	url := uxUrl
	if len(path) > 0 {
		url += path[0]
	}
	cmd := exec.CommandContext(c, config.ProcessName(os.Args[0]), "webview", "--url", url)
	cmd.Stderr = os.Stderr
	cmd.Stdout = os.Stdout
	viewCancel = func() {
		cancelling = true
		cancel()
	}
	cancelling = false
	if e := cmd.Run(); e != nil {
		if !cancelling {
			log.Logger(trayCtx).Error("Error while starting WebView - Opening in browser instead: " + e.Error())
			open.Run(uxUrl)
		}
	}
	// Clear cancel after Run finish
	viewCancel = nil
}

var (
	knownDisconnections map[string]bool
	kcLock              *sync.Mutex
)

func taskStatus(t *common.ConcreteSyncState) (hasError, isProcessing bool, label string) {

	label = t.Config.Label
	switch t.Status {
	case model.TaskStatusDisabled:
		label += " (" + i18n.T("tray.task.status.disabled") + ")"
	case model.TaskStatusPaused:
		label += " (" + i18n.T("tray.task.status.paused") + ")"
	case model.TaskStatusProcessing:
		label += " (" + i18n.T("tray.task.status.processing") + ")"
		isProcessing = true
	case model.TaskStatusError:
		label += " (" + i18n.T("tray.task.status.error") + ")"
		hasError = true
		return
	}
	disconnected := !t.LeftInfo.Connected || !t.RightInfo.Connected
	if kcLock == nil {
		knownDisconnections = make(map[string]bool)
		kcLock = &sync.Mutex{}
	}
	kcLock.Lock()
	if prevDisconnected, ok := knownDisconnections[t.Config.Uuid]; disconnected && ok && prevDisconnected {
		// Previous state was already disconnected (=> twice)
		label += " (" + i18n.T("tray.task.status.disconnected") + ")"
		hasError = true
		//notify("CellsSync", "Server is disconnected")
	} else if disconnected && ok && !prevDisconnected {
		// first disconnection detected => recheck in 10s
		go func() {
			<-time.After(10 * time.Second)
			ws.Poll()
		}()
	}
	knownDisconnections[t.Config.Uuid] = disconnected
	kcLock.Unlock()
	return
}

func onReady() {
	systray.SetIcon(iconData)
	setIconActive()
	systray.SetTitle(i18n.T("tray.title.starting"))
	systray.SetTooltip(i18n.T("application.title"))
	mOpen := systray.AddMenuItem(i18n.T("tray.menu.open"), i18n.T("tray.menu.open.legend"))
	mOpen.Disable()
	mPause := systray.AddMenuItem(i18n.T("main.all.pause"), i18n.T("main.all.pause.legend"))
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

	haltBus := control.GetBus().Sub(control.TopicGlobal)

	// We can manipulate the systray in other goroutines
	go func() {
		for {
			select {
			case msg := <-haltBus:
				if m, ok := msg.(control.CommandMessage); ok && m == control.MessageHalt {
					beforeExit()
					systray.Quit()
					return
				}
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
				if firstRun {
					disableFirstRun()
					if len(tasks) == 0 {
						go spawnWebView("/tasks/create")
					}
				}
				var hasError bool
				var errorLabel string
				var hasProcessing bool
				allPaused := true
				for _, t := range tasks {
					tErr, tProc, label := taskStatus(t)
					if tErr {
						hasError = true
						errorLabel = label
					} else if tProc {
						hasProcessing = true
					}
					allPaused = allPaused && (t.Status == model.TaskStatusPaused)
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
						break
					}
				}
				if hasError {
					setIconError(errorLabel)
				} else if hasProcessing {
					setIconActive()
				} else {
					setIconIdle()
				}
				for k, slot := range stateSlots {
					if k >= len(tasks) {
						slot.Hide()
					}
				}
				if len(tasks) > 0 && allPaused {
					setIconPause()
					mPause.SetTitle(i18n.T("main.all.resume"))
					mPause.SetTooltip(i18n.T("main.all.resume.legend"))
					pauseToggle = true
				} else {
					mPause.SetTitle(i18n.T("main.all.pause"))
					mPause.SetTooltip(i18n.T("main.all.pause.legend"))
					pauseToggle = false
				}
			case e := <-ws.Errors:
				log.Logger(trayCtx).Error("Received error from client " + e.Error())
			case <-mOpen.ClickedCh:
				go spawnWebView()
			case <-mNewTasks.ClickedCh:
				go spawnWebView("/tasks/create")
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
			case <-mPause.ClickedCh:
				if pauseToggle {
					ws.SendCmd(&common.CmdContent{Cmd: "resume"})
				} else {
					ws.SendCmd(&common.CmdContent{Cmd: "pause"})
				}
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
