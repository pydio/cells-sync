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

// Package config provides a simple config management implementation based on JSON files.
package config

import (
	"context"
	"fmt"
	"path/filepath"

	"github.com/pydio/cells/common/log"
)

const (
	UpdateDefaultChannel   = "stable"
	UpdateDefaultServerUrl = "https://updatecells.pydio.com/"
	UpdateDefaultPublicKey = "-----BEGIN PUBLIC KEY-----\nMIIBCgKCAQEAwh/ofjZTITlQc4h/qDZMR3RquBxlG7UTunDKLG85JQwRtU7EL90v\nlWxamkpSQsaPeqho5Q6OGkhJvZkbWsLBJv6LZg+SBhk6ZSPxihD+Kfx8AwCcWZ46\nDTpKpw+mYnkNH1YEAedaSfJM8d1fyU1YZ+WM3P/j1wTnUGRgebK9y70dqZEo2dOK\nn98v3kBP7uEN9eP/wig63RdmChjCpPb5gK1/WKnY4NFLQ60rPAOBsXurxikc9N/3\nEvbIB/1vQNqm7yEwXk8LlOC6Fp8W/6A0DIxr2BnZAJntMuH2ulUfhJgw0yJalMNF\nDR0QNzGVktdLOEeSe8BSrASe9uZY2SDbTwIDAQAB\n-----END PUBLIC KEY-----"
)

// Global is the main struct representing configs.
type Global struct {
	Tasks       []*Task
	Authorities []*Authority
	Logs        *Logs
	Updates     *Updates
	Debugging   *Debugging
	Service     *Service
	changes     []chan interface{}
}

// TaskChange is an event sent when something changes inside the configs tasks.
type TaskChange struct {
	Type string
	Task *Task
}

// Tasks represents a sync task configuration.
type Task struct {
	Uuid           string
	Label          string
	LeftURI        string
	RightURI       string
	Direction      string
	SelectiveRoots []string

	Realtime     bool
	LoopInterval string
	HardInterval string
}

// Logs represents the logs configuration.
type Logs struct {
	Folder         string
	MaxFilesNumber int
	MaxFilesSize   int
	MaxAgeDays     int
}

// Updates represents the update-mechanism configuration.
type Updates struct {
	Frequency       string
	DownloadAuto    bool
	UpdateChannel   string
	UpdateUrl       string
	UpdatePublicKey string
}

// Debugging is a simple section for showing/hiding special debug panels.
type Debugging struct {
	ShowPanels bool
}

// Service is a simple section for enabling/disabling shortcuts or service (depending on OS).
type Service struct {
	AutoStart bool
}

// ShortcutOptions defines where to create shortcuts.
type ShortcutOptions struct {
	Shortcut  bool
	AutoStart bool
}

// ShortcutInstaller provides tools for installing / removing os-shortcuts for automatic startup.
type ShortcutInstaller interface {
	Install(options ShortcutOptions) error
	Uninstall() error
	IsInstalled() bool
}

// NewLogs creates defaults for Logs.
func NewLogs() *Logs {
	return &Logs{
		Folder:         filepath.Join(SyncClientDataDir(), "logs"),
		MaxFilesNumber: 8,
		MaxAgeDays:     30,
		MaxFilesSize:   50, // Mega Bytes
	}
}

// NewUpdates creates defaults for Updates.
func NewUpdates() *Updates {
	return &Updates{
		Frequency:       "restart",
		DownloadAuto:    false, // Not supported yet
		UpdateChannel:   UpdateDefaultChannel,
		UpdateUrl:       UpdateDefaultServerUrl,
		UpdatePublicKey: UpdateDefaultPublicKey,
	}
}

// CreateTask adds a Task to the config and emits a TaskChange event "create".
func (g *Global) CreateTask(t *Task) error {
	g.Tasks = append(g.Tasks, t)
	e := Save()
	if e == nil {
		go func() {
			for _, c := range g.changes {
				c <- &TaskChange{Type: "create", Task: t}
			}
		}()
	}
	return e
}

// RemoveTask removes a Task from the config and emits a TaskChange event "remove".
func (g *Global) RemoveTask(task *Task) error {
	var newTasks []*Task
	for _, t := range g.Tasks {
		if t.Uuid != task.Uuid {
			newTasks = append(newTasks, t)
		}
	}
	g.Tasks = newTasks
	e := Save()
	if e == nil {
		go func() {
			for _, c := range g.changes {
				c <- &TaskChange{Type: "remove", Task: task}
			}
		}()
	}
	return e
}

// UpdateTask updates a Task inside the config and emits a TaskChange event "update".
func (g *Global) UpdateTask(task *Task) error {
	var newTasks []*Task
	for _, t := range g.Tasks {
		if t.Uuid == task.Uuid {
			newTasks = append(newTasks, task)
		} else {
			newTasks = append(newTasks, t)
		}
	}
	g.Tasks = newTasks
	e := Save()
	if e == nil {
		go func() {
			for _, c := range g.changes {
				c <- &TaskChange{Type: "update", Task: task}
			}
		}()
	}
	return e
}

// UpdateGlobals updates various sections of config (each parameter can be nil).
func (g *Global) UpdateGlobals(logs *Logs, updates *Updates, debugging *Debugging, service *Service) error {
	if logs != nil {
		g.Logs = logs
	}
	if updates != nil {
		g.Updates = updates
	}
	if debugging != nil {
		g.Debugging = debugging
	}
	if service != nil {
		if g.Service != nil {
			if service.AutoStart != g.Service.AutoStart {
				if e := g.setAutoStartValue(service.AutoStart); e != nil {
					service.AutoStart = g.Service.AutoStart
				}
			}
		}
		g.Service = service
	}
	return Save()
}

// readAutoStartValue either detects if the app is installed as service or if shortcuts links are created,
// depending on the platform.
func (g *Global) readAutoStartValue() bool {
	if sI := GetOSShortcutInstaller(); sI != nil {
		return sI.IsInstalled()
	} else {
		return ServiceInstalled()
	}
}

// setAutoStartValue tries to call a ShortcutInstaller or to install a service, depending on the OS.
func (g *Global) setAutoStartValue(autoStart bool) error {
	var e error
	if sI := GetOSShortcutInstaller(); sI != nil {
		if autoStart {
			e = sI.Install(ShortcutOptions{AutoStart: true, Shortcut: true})
		} else {
			e = sI.Uninstall()
		}
	} else {
		if autoStart {
			log.Logger(context.Background()).Info("Installing Cells-Sync as service")
			e = ControlAppService(ServiceCmdInstall)
		} else {
			//e = ControlAppService(ServiceCmdUninstall)
			log.Logger(context.Background()).Info("We should uninstall Cells-Sync as service but it stops the current process!")
			return fmt.Errorf("cannot uninstall service from within the application")
		}
	}
	return e
}

// Items provides a readable list of labels representing sync tasks stored in config.
func (g *Global) Items() (items []string) {
	for _, t := range g.Tasks {
		dir := "<=>"
		if t.Direction == "Left" {
			dir = "=>"
		} else if t.Direction == "Right" {
			dir = "<="
		}
		items = append(items, t.LeftURI+" "+dir+" "+t.RightURI)
	}
	return
}

var def *Global

// Default provides a usable config object. It is loaded from a JSON file.
func Default() *Global {
	if def == nil {
		if c, e := LoadFromFile(); e == nil {
			def = c
		} else {
			def = &Global{}
		}
		if def.Logs == nil {
			def.Logs = NewLogs()
		}
		if def.Updates == nil {
			def.Updates = NewUpdates()
		}
		if def.Debugging == nil {
			def.Debugging = &Debugging{}
		}
		if def.Service == nil {
			def.Service = &Service{}
		}
		// Dynamically read autoStart value
		def.Service.AutoStart = def.readAutoStartValue()
		if len(def.Authorities) > 0 {
			for _, a := range def.Authorities {
				a.AfterLoad()
			}
		}
	}
	return def
}

// Save writes the config to the JSON file.
func Save() error {
	// Copy def and update Authorities before saving
	toSave := *def
	toSave.Authorities = []*Authority{}
	for _, a := range def.Authorities {
		toSave.Authorities = append(toSave.Authorities, a.BeforeSave())
	}
	return WriteToFile(&toSave)
}

// Watch provides a chan emitting events on config changes.
func Watch() chan interface{} {
	changes := make(chan interface{})
	def.changes = append(def.changes, changes)
	return changes
}
