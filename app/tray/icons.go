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

package tray

import (
	"runtime"
	"time"

	"github.com/getlantern/systray"

	coloricon "github.com/pydio/cells-sync/app/tray/color/icon"
	coloractive "github.com/pydio/cells-sync/app/tray/color/iconactive"
	coloractive2 "github.com/pydio/cells-sync/app/tray/color/iconactive2"
	colorerror "github.com/pydio/cells-sync/app/tray/color/iconerror"
	colorpause "github.com/pydio/cells-sync/app/tray/color/iconpause"

	darkicon "github.com/pydio/cells-sync/app/tray/dark/icon"
	darkactive "github.com/pydio/cells-sync/app/tray/dark/iconactive"
	darkactive2 "github.com/pydio/cells-sync/app/tray/dark/iconactive2"
	darkerror "github.com/pydio/cells-sync/app/tray/dark/iconerror"
	darkpause "github.com/pydio/cells-sync/app/tray/dark/iconpause"
)

var (
	iconData        = coloricon.Data
	iconActiveData  = coloractive.Data
	iconActive2Data = coloractive2.Data
	iconErrorData   = colorerror.Data
	iconPauseData   = colorpause.Data
	activeToggler   bool
	crtStatus       string
	status          chan string
)

func init() {
	if runtime.GOOS == "darwin" {
		iconData = darkicon.Data
		iconActiveData = darkactive.Data
		iconActive2Data = darkactive2.Data
		iconErrorData = darkerror.Data
		iconPauseData = darkpause.Data
	}
	status = make(chan string, 1)
	go func() {
		for {
			select {
			case <-time.After(750 * time.Millisecond):
				if crtStatus != "active" {
					break
				}
				if !activeToggler {
					systray.SetTemplateIcon(iconActiveData, iconActiveData)
				} else {
					systray.SetTemplateIcon(iconActive2Data, iconActive2Data)
				}
				activeToggler = !activeToggler

			case s := <-status:
				if crtStatus == s {
					break
				}
				var data []byte
				crtStatus = s
				switch s {
				case "active":
					activeToggler = false
					data = iconActiveData
				case "idle":
					data = iconData
				case "error":
					data = iconErrorData
				case "pause":
					data = iconPauseData
				}
				systray.SetTemplateIcon(data, data)
			}
		}
	}()
}

func setIconActive() {
	status <- "active"
}

func setIconIdle() {
	status <- "idle"
}

func setIconError(msg ...string) {
	if len(msg) > 0 && crtStatus != "error" {
		// TODO
		// notify("CellsSync", msg[0])
	}
	status <- "error"
}

func setIconPause() {
	status <- "pause"
}
