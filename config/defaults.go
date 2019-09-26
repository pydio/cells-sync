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
	"path/filepath"

	"github.com/pydio/cells/common/log"
	"golang.org/x/net/context"
)

const (
	UpdateDefaultChannel   = "stable"
	UpdateDefaultServerUrl = "https://updatecells.pydio.com/"
	UpdateDefaultPublicKey = "-----BEGIN PUBLIC KEY-----\nMIIBCgKCAQEAwh/ofjZTITlQc4h/qDZMR3RquBxlG7UTunDKLG85JQwRtU7EL90v\nlWxamkpSQsaPeqho5Q6OGkhJvZkbWsLBJv6LZg+SBhk6ZSPxihD+Kfx8AwCcWZ46\nDTpKpw+mYnkNH1YEAedaSfJM8d1fyU1YZ+WM3P/j1wTnUGRgebK9y70dqZEo2dOK\nn98v3kBP7uEN9eP/wig63RdmChjCpPb5gK1/WKnY4NFLQ60rPAOBsXurxikc9N/3\nEvbIB/1vQNqm7yEwXk8LlOC6Fp8W/6A0DIxr2BnZAJntMuH2ulUfhJgw0yJalMNF\nDR0QNzGVktdLOEeSe8BSrASe9uZY2SDbTwIDAQAB\n-----END PUBLIC KEY-----"
)

type Global struct {
	Tasks       []*Task
	Authorities []*Authority
	Logs        *Logs
	Updates     *Updates
	Debugging   *Debugging
	Service     *Service
	changes     []chan interface{}
}

type TaskChange struct {
	Type string
	Task *Task
}

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

type Logs struct {
	Folder         string
	MaxFilesNumber int
	MaxFilesSize   int
	MaxAgeDays     int
}

type Updates struct {
	Frequency       string
	DownloadAuto    bool
	UpdateChannel   string
	UpdateUrl       string
	UpdatePublicKey string
}

type Debugging struct {
	ShowPanels bool
}

type Service struct {
	RunAsService bool
}

func NewLogs() *Logs {
	return &Logs{
		Folder:         filepath.Join(SyncClientDataDir(), "logs"),
		MaxFilesNumber: 8,
		MaxAgeDays:     30,
		MaxFilesSize:   50, // Mega Bytes
	}
}

func NewUpdates() *Updates {
	return &Updates{
		Frequency:       "restart",
		DownloadAuto:    true,
		UpdateChannel:   UpdateDefaultChannel,
		UpdateUrl:       UpdateDefaultServerUrl,
		UpdatePublicKey: UpdateDefaultPublicKey,
	}
}

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
			if service.RunAsService != g.Service.RunAsService {
				if service.RunAsService {
					log.Logger(context.Background()).Info("Installing Cells-Sync as service")
					ControlAppService(ServiceCmdInstall)
				} else {
					log.Logger(context.Background()).Info("Uninstalling Cells-Sync as service")
					ControlAppService(ServiceCmdUninstall)
				}
			}
		}
		g.Service = service
	}
	return Save()
}

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
		if len(def.Authorities) > 0 {
			for _, a := range def.Authorities {
				go monitorToken(a)
			}
		}
	}
	return def
}

func Save() error {
	return WriteToFile(def)
}

func Watch() chan interface{} {
	changes := make(chan interface{})
	def.changes = append(def.changes, changes)
	return changes
}
