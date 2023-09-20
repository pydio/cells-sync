/**
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

// Package common exposes package variables that are updated via ldflags compilation
package common

import (
	"context"
	"encoding/json"
	"fmt"
	"runtime/debug"
	"time"

	"github.com/pydio/cells/v4/common/log"
	"github.com/pydio/cells/v4/common/proto/update"
	"github.com/pydio/cells/v4/common/sync/model"

	"github.com/pydio/cells-sync/config"
)

var (
	Version      = "0.1.0"
	PackageType  = "CellsSync"
	PackageLabel = "Cells Sync Client"
)

// EndpointInfo provides information about a connection to an endpoint
type EndpointInfo struct {
	Stats          *model.EndpointRootStat
	Connected      bool
	WatcherActive  bool
	LastConnection time.Time
}

// SyncState provides information about a sync task
type SyncState struct {
	// Sync Process
	UUID   string
	Config *config.Task

	Status             model.TaskStatus
	LastSyncTime       time.Time    `json:"LastSyncTime,omitempty"`
	LastOpsTime        time.Time    `json:"LastOpsTime,omitempty"`
	LastProcessStatus  model.Status `json:"LastProcessStatus,omitempty"`
	LeftProcessStatus  model.Status `json:"LeftProcessStatus,omitempty"`
	RightProcessStatus model.Status `json:"RightProcessStatus,omitempty"`

	// Endpoints Current Info
	LeftInfo  *EndpointInfo
	RightInfo *EndpointInfo
}

// ConcreteSyncState is used for unmarshaling
type ConcreteSyncState struct {
	// Sync Process
	UUID   string
	Config *config.Task

	Status             model.TaskStatus
	LastSyncTime       time.Time               `json:"LastSyncTime,omitempty"`
	LastOpsTime        time.Time               `json:"LastOpsTime,omitempty"`
	LastProcessStatus  *model.ProcessingStatus `json:"LastProcessStatus,omitempty"`
	LeftProcessStatus  *model.ProcessingStatus `json:"LeftProcessStatus,omitempty"`
	RightProcessStatus *model.ProcessingStatus `json:"RightProcessStatus,omitempty"`

	// Endpoints Current Info
	LeftInfo  *EndpointInfo
	RightInfo *EndpointInfo
}

// Message is a generic container for RPC
type Message struct {
	Type    string
	Content interface{}
}

// CmdContent is a generic container for a Cmd sent via RPC
type CmdContent struct {
	UUID string
	Cmd  string
}

// ConfigContent is a generic container for a Config sent via RPV
type ConfigContent struct {
	Cmd       string
	Task      *config.Task
	Authority *config.Authority
}

// Various messages for communicating with service
type UpdateMessage interface {
	UpdateMessage()
}

// UpdateCheckRequest triggers a check for updates
type UpdateCheckRequest struct {
	Check   bool
	Version bool
}

// UpdateVersion is a binary available for update
type UpdateVersion struct {
	PackageName string
	Version     string
	Revision    string
	BuildStamp  string
}

// UpdateCheckStatus provides a list of available binaries
type UpdateCheckStatus struct {
	CheckStatus string
	Binaries    []*update.Package
	Error       string `json:"error,omitempty"`
}

// UpdateApplyRequest triggers an actual update
type UpdateApplyRequest struct {
	Package *update.Package
	DryRun  bool
}

// UpdateApplyStatus is a response to an UpdateApplyRequest
type UpdateApplyStatus struct {
	ApplyStatus string
	Package     *update.Package
	Progress    float32
	Error       string
}

// Detect message type
func (u *UpdateCheckRequest) UpdateMessage() {}
func (u *UpdateCheckStatus) UpdateMessage()  {}
func (u *UpdateApplyRequest) UpdateMessage() {}
func (u *UpdateApplyStatus) UpdateMessage()  {}

// Bytes returns json-marshaled content of the message
func (m *Message) Bytes() []byte {
	d, e := json.Marshal(m)
	if e != nil {
		log.Logger(context.Background()).Info("CANNOT JSON-ENCODE MESSAGE!" + e.Error())
	}
	return d
}

// MessageFromData parses generic Message from JSON and tries to cast its content to the according type.
func MessageFromData(d []byte) *Message {
	var m Message
	if e := json.Unmarshal(d, &m); e == nil {
		if m.Type == "CMD" {
			// Convert Content to CmdContent
			d, _ := json.Marshal(m.Content)
			var cmdContent CmdContent
			if e := json.Unmarshal(d, &cmdContent); e == nil {
				m.Content = &cmdContent
			} else {
				log.Logger(context.Background()).Error("Cannot unmarshal CmdContent: " + e.Error() + ":" + string(d))
			}
		} else if m.Type == "CONFIG" {
			d, _ := json.Marshal(m.Content)
			var configContent ConfigContent
			if e := json.Unmarshal(d, &configContent); e == nil {
				m.Content = &configContent
			} else {
				log.Logger(context.Background()).Error("Cannot unmarshal ConfigContent: " + e.Error() + ":" + string(d))
			}
		} else if m.Type == "STATE" {
			d, _ := json.Marshal(m.Content)
			var state ConcreteSyncState
			if e := json.Unmarshal(d, &state); e == nil {
				m.Content = &state
			} else {
				log.Logger(context.Background()).Error("Cannot unmarshal ConcreteSyncState: " + e.Error() + ":" + string(d))
			}
		} else if m.Type == "UPDATE" {
			d, _ := json.Marshal(m.Content)
			var checkRequest UpdateCheckRequest
			var applyRequest UpdateApplyRequest
			if e := json.Unmarshal(d, &checkRequest); e == nil && (checkRequest.Check || checkRequest.Version) {
				m.Content = &checkRequest
			} else if e := json.Unmarshal(d, &applyRequest); e == nil && applyRequest.Package != nil {
				m.Content = &applyRequest
			} else {
				log.Logger(context.Background()).Debug("Ignoring Update Message (probably a response):" + string(d))
			}
		} else if m.Type == "SERVICE" {
			if sCmd, ok := m.Content.(string); ok && config.AllowedServiceCmd(sCmd) {
				log.Logger(context.Background()).Debug("Controlling service with command:" + sCmd)
				config.ControlAppService(config.ServiceCmd(sCmd))
			} else {
				log.Logger(context.Background()).Error("Could not recognize service command!")
			}
		}
		return &m
	} else {
		m.Type = "ERROR"
		m.Content = e.Error()
		return &m
	}

}

// PrintVersion prints information about the current build
func PrintVersion() {

	rev, ts := VcsInfo()

	fmt.Println("")
	fmt.Println("    " + fmt.Sprintf("%s (%s)", PackageLabel, Version))
	fmt.Println("    " + fmt.Sprintf("Revision Commit %s", rev))
	fmt.Println("    " + fmt.Sprintf("Commit Stamp %s", ts.Format(time.RFC822Z)))
	fmt.Println("")

}

// VcsInfo returns the vcs.revision and vcs.time debug info
func VcsInfo() (string, time.Time) {
	rev := ""
	ts := time.Now()
	if info, ok := debug.ReadBuildInfo(); ok {
		for _, s := range info.Settings {
			switch s.Key {
			case "vcs.revision":
				rev = s.Value
			case "vcs.time":
				if s.Value != "" {
					ts, _ = time.Parse("2006-01-02T15:04:05Z", s.Value)
				}
			default:
			}
		}
	}
	return rev, ts
}
