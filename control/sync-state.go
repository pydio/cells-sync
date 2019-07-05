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
	"net/url"
	"sync"
	"time"

	"github.com/pydio/sync/common"

	"github.com/pydio/cells/common/sync/model"
	"github.com/pydio/sync/config"
)

func compareURI(status, config string) bool {
	sU, _ := url.Parse(status)
	cU, _ := url.Parse(config)
	return sU.Scheme == cU.Scheme && sU.Host == cU.Host && sU.Path == cU.Path
}

type StateStore interface {
	LastState() common.SyncState
	UpdateConnection(c bool, i *model.EndpointInfo) common.SyncState
	BothConnected() bool
	TouchLastOpsTime(t ...time.Time)
	UpdateSyncStatus(s model.TaskStatus) common.SyncState
	UpdateProcessStatus(processStatus model.Status, status ...model.TaskStatus) common.SyncState
}

type MemoryStateStore struct {
	sync.Mutex
	config *config.Task
	state  common.SyncState
}

func NewMemoryStateStore(config *config.Task) *MemoryStateStore {
	s := &MemoryStateStore{
		config: config,
		state: common.SyncState{
			UUID:      config.Uuid,
			Config:    config,
			Status:    model.TaskStatusIdle,
			LeftInfo:  &common.EndpointInfo{Connected: false},
			RightInfo: &common.EndpointInfo{Connected: false},
		},
	}
	return s
}

func (b *MemoryStateStore) LastState() common.SyncState {
	b.Lock()
	defer b.Unlock()
	return b.state
}

func (b *MemoryStateStore) TouchLastOpsTime(t ...time.Time) {
	b.Lock()
	if len(t) > 0 {
		b.state.LastOpsTime = t[0]
	} else {
		b.state.LastOpsTime = time.Now()
	}
	b.Unlock()
}

func (b *MemoryStateStore) UpdateSyncStatus(s model.TaskStatus) common.SyncState {
	b.Lock()
	defer b.Unlock()
	b.state.Status = s
	return b.state
}

func (b *MemoryStateStore) UpdateProcessStatus(processStatus model.Status, status ...model.TaskStatus) common.SyncState {
	b.Lock()
	defer b.Unlock()
	b.state.LastSyncTime = time.Now()
	if processStatus.EndpointURI() != "" && compareURI(b.config.LeftURI, processStatus.EndpointURI()) {
		b.state.LeftProcessStatus = processStatus
	} else if processStatus.EndpointURI() != "" && compareURI(b.config.RightURI, processStatus.EndpointURI()) {
		b.state.RightProcessStatus = processStatus
	} else {
		b.state.LastProcessStatus = processStatus
	}
	if len(status) > 0 {
		b.state.Status = status[0]
	}
	GetBus().Pub(b.state, TopicState)
	return b.state
}

func (b *MemoryStateStore) UpdateConnection(c bool, i *model.EndpointInfo) common.SyncState {
	b.Lock()
	defer b.Unlock()
	simpleURI := func(uri string) string {
		u, _ := url.Parse(uri)
		out := fmt.Sprintf("%s://%s%s", u.Scheme, u.Host, u.Path)
		return out
	}
	var internalInfo *common.EndpointInfo
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
