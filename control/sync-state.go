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

package control

import (
	"fmt"
	"math"
	"net/url"
	"sync"
	"time"

	"github.com/pydio/cells/common/sync/merger"
	"github.com/pydio/cells/common/sync/model"
	"github.com/pydio/sync/config"
)

type SyncStatus int

const (
	SyncStatusIdle SyncStatus = iota
	SyncStatusPaused
	SyncStatusDisabled
	SyncStatusProcessing
	SyncStatusError
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

	Status             SyncStatus
	LastSyncTime       time.Time
	LastProcessStatus  merger.ProcessStatus
	LeftProcessStatus  merger.ProcessStatus
	RightProcessStatus merger.ProcessStatus

	// Endpoints Current Info
	LeftInfo  *EndpointInfo
	RightInfo *EndpointInfo
}

func compareURI(status, config string) bool {
	sU, _ := url.Parse(status)
	cU, _ := url.Parse(config)
	return sU.Scheme == cU.Scheme && sU.Host == cU.Host && sU.Path == cU.Path
}

type StateStore interface {
	LastState() SyncState
	UpdateConnection(c bool, i *model.EndpointInfo) SyncState
	BothConnected() bool
	UpdateSyncStatus(s SyncStatus) SyncState
	UpdateProcessStatus(processStatus merger.ProcessStatus, status ...SyncStatus) SyncState
}

type MemoryStateStore struct {
	sync.Mutex
	config *config.Task
	state  SyncState
}

func NewMemoryStateStore(config *config.Task) *MemoryStateStore {
	s := &MemoryStateStore{
		config: config,
		state: SyncState{
			UUID:      config.Uuid,
			Config:    config,
			Status:    SyncStatusIdle,
			LeftInfo:  &EndpointInfo{Connected: false},
			RightInfo: &EndpointInfo{Connected: false},
		},
	}
	return s
}

func (b *MemoryStateStore) LastState() SyncState {
	b.Lock()
	defer b.Unlock()
	return b.state
}

func (b *MemoryStateStore) UpdateSyncStatus(s SyncStatus) SyncState {
	b.Lock()
	defer b.Unlock()
	b.state.Status = s
	return b.state
}

func (b *MemoryStateStore) UpdateProcessStatus(processStatus merger.ProcessStatus, status ...SyncStatus) SyncState {
	b.Lock()
	defer b.Unlock()
	if math.IsNaN(float64(processStatus.Progress)) {
		processStatus.Progress = 0
	}
	b.state.LastSyncTime = time.Now()
	if processStatus.EndpointURI != "" && compareURI(b.config.LeftURI, processStatus.EndpointURI) {
		b.state.LeftProcessStatus = processStatus
	} else if processStatus.EndpointURI != "" && compareURI(b.config.RightURI, processStatus.EndpointURI) {
		b.state.RightProcessStatus = processStatus
	} else {
		b.state.LastProcessStatus = processStatus
	}
	if len(status) > 0 {
		b.state.Status = status[0]
	}
	return b.state
}

func (b *MemoryStateStore) UpdateConnection(c bool, i *model.EndpointInfo) SyncState {
	b.Lock()
	defer b.Unlock()
	simpleURI := func(uri string) string {
		u, _ := url.Parse(uri)
		out := fmt.Sprintf("%s://%s%s", u.Scheme, u.Host, u.Path)
		return out
	}
	var internalInfo *EndpointInfo
	if i.URI == simpleURI(b.config.LeftURI) {
		internalInfo = b.state.LeftInfo
	} else if i.URI == simpleURI(b.config.RightURI) {
		internalInfo = b.state.RightInfo
	} else {
		return b.state
	}
	internalInfo.Connected = c
	if c {
		internalInfo.LastConnection = time.Now()
	}
	return b.state
}

func (b *MemoryStateStore) BothConnected() bool {
	b.Lock()
	defer b.Unlock()
	return b.state.LeftInfo.Connected && b.state.RightInfo.Connected
}
