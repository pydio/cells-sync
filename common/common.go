package common

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/pydio/cells/common/sync/model"

	"github.com/pydio/cells/common/log"
	"github.com/pydio/sync/config"
)

var (
	Version       = "0.0.0"
	BuildStamp    = ""
	BuildRevision = ""
)

type EndpointInfo struct {
	Connected      bool
	LastConnection time.Time

	FoldersCount   uint64
	FilesCount     uint64
	TotalSpace     uint64
	AvailableSpace uint64
}

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

type Message struct {
	Type    string
	Content interface{}
}

type CmdContent struct {
	UUID string
	Cmd  string
}

type ConfigContent struct {
	Cmd    string
	Config *config.Task
}

func (m *Message) Bytes() []byte {
	d, e := json.Marshal(m)
	if e != nil {
		log.Logger(context.Background()).Info("CANNOT JSON-ENCODE MESSAGE!" + e.Error())
	}
	return d
}

func MessageFromData(d []byte) *Message {
	var m Message
	if e := json.Unmarshal(d, &m); e == nil {
		if m.Type == "CMD" {
			// Convert Content to CmdContent
			d, _ := json.Marshal(m.Content)
			var cmdContent CmdContent
			if e := json.Unmarshal(d, &cmdContent); e == nil {
				m.Content = &cmdContent
			}
		} else if m.Type == "CONFIG" {
			d, _ := json.Marshal(m.Content)
			var configContent ConfigContent
			if e := json.Unmarshal(d, &configContent); e == nil {
				m.Content = &configContent
			}
		} else if m.Type == "STATE" {
			d, _ := json.Marshal(m.Content)
			var state SyncState
			if e := json.Unmarshal(d, &state); e == nil {
				m.Content = &state
			}
		}
		return &m
	} else {
		m.Type = "ERROR"
		m.Content = e.Error()
		return &m
	}

}

func PrintVersion(appName string) {
	fmt.Println(appName, Version)
	fmt.Println(BuildRevision)
	fmt.Println(BuildStamp)
}
