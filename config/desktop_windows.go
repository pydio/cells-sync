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
package config

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"

	"github.com/go-ole/go-ole"
	"github.com/go-ole/go-ole/oleutil"
)

func GetOSShortcutInstaller() ShortcutInstaller {
	return &winShortcuts{}
}

var startupLink = filepath.Join(os.Getenv("APPDATA"), "Microsoft", "Windows", "Start Menu", "Programs", "StartUp", "CellsSync.lnk")

type winShortcuts struct{}

func (w winShortcuts) Install(options ShortcutOptions) error {

	runtime.LockOSThread()
	defer runtime.UnlockOSThread()

	dst := startupLink
	src := ProcessName(os.Args[0])
	fmt.Printf("Creating shortcut to %s inside %s\n", src, dst)

	err := ole.CoInitializeEx(0, ole.COINIT_APARTMENTTHREADED|ole.COINIT_SPEED_OVER_MEMORY)
	if err != nil {
		return err
	}

	oleShellObject, err := oleutil.CreateObject("WScript.Shell")
	if err != nil {
		return err
	}
	defer oleShellObject.Release()
	wshell, err := oleShellObject.QueryInterface(ole.IID_IDispatch)
	if err != nil {
		return err
	}
	defer wshell.Release()
	cs, err := oleutil.CallMethod(wshell, "CreateShortcut", dst)
	if err != nil {
		return err
	}
	idispatch := cs.ToIDispatch()
	_, err = oleutil.PutProperty(idispatch, "TargetPath", src)
	if err != nil {
		return err
	}
	_, err = oleutil.CallMethod(idispatch, "Save")
	return err
}

func (w winShortcuts) Uninstall() error {
	return os.Remove(startupLink)
}

func (w winShortcuts) IsInstalled() bool {
	_, e := os.Stat(startupLink)
	return e == nil
}
