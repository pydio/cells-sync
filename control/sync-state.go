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

package control

import (
	"fmt"
	"io/ioutil"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/pydio/cells-sync/common"
	"github.com/pydio/cells-sync/config"
	"github.com/pydio/cells/common/sync/model"
)

func compareURI(status, config string) bool {
	sU, _ := url.Parse(status)
	cU, _ := url.Parse(config)
	return sU.Scheme == cU.Scheme && sU.Host == cU.Host && sU.Path == cU.Path
}

// StateStore is used to maintain the states of the sync tasks
type StateStore interface {
	LastState() common.SyncState
	BothConnected() bool
	TouchLastOpsTime(t ...time.Time)
	Close()

	UpdateConnection(c bool, i model.EndpointInfo) common.SyncState
	UpdateWatcherActivity(a bool, i model.EndpointInfo) common.SyncState
	UpdateEndpointStats(s *model.EndpointRootStat, i model.EndpointInfo) common.SyncState

	UpdateSyncStatus(s model.TaskStatus) common.SyncState
	UpdateProcessStatus(processStatus model.Status, status ...model.TaskStatus) common.SyncState
}

// MemoryStateStore keeps all SyncStates in memory.
type MemoryStateStore struct {
	sync.Mutex
	config *config.Task
	state  common.SyncState
}

// NewMemoryStateStore creates a MemoryStateStore.
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

// Close closes the state store
func (b *MemoryStateStore) Close() {}

// LastState returns the last known state of the task.
func (b *MemoryStateStore) LastState() common.SyncState {
	b.Lock()
	defer b.Unlock()
	return b.state
}

// TouchLastOps updates the time of last known operation.
func (b *MemoryStateStore) TouchLastOpsTime(t ...time.Time) {
	b.Lock()
	if len(t) > 0 {
		b.state.LastOpsTime = t[0]
	} else {
		b.state.LastOpsTime = time.Now()
	}
	b.Unlock()
}

// UpdateSyncStatus updates the internal status.
func (b *MemoryStateStore) UpdateSyncStatus(s model.TaskStatus) common.SyncState {
	b.Lock()
	defer b.Unlock()
	b.state.Status = s
	return b.state
}

// UpdateProcessStatus updates the status of one endpoint. It is recognized based on its EndpointURI.
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

// UpdateConnection updates the connection status of one endpoint.
func (b *MemoryStateStore) UpdateConnection(c bool, i model.EndpointInfo) common.SyncState {
	b.Lock()
	defer b.Unlock()
	if internalInfo, ok := b.internalInfoFromEndpointInfo(i); ok {
		internalInfo.Connected = c
		if c {
			internalInfo.LastConnection = time.Now()
		}
	}
	return b.state
}

// UpdateWatcherActivity updates the watcher status of one endpoint.
func (b *MemoryStateStore) UpdateWatcherActivity(a bool, i model.EndpointInfo) common.SyncState {
	b.Lock()
	defer b.Unlock()
	if internalInfo, ok := b.internalInfoFromEndpointInfo(i); ok {
		internalInfo.WatcherActive = a
	}
	return b.state
}

// UpdateEndpointStats updates the statistics about the root of one endpoint.
func (b *MemoryStateStore) UpdateEndpointStats(s *model.EndpointRootStat, i model.EndpointInfo) common.SyncState {
	b.Lock()
	defer b.Unlock()
	if internalInfo, ok := b.internalInfoFromEndpointInfo(i); ok {
		internalInfo.Stats = s
	}
	return b.state
}

func (b *MemoryStateStore) internalInfoFromEndpointInfo(info model.EndpointInfo) (*common.EndpointInfo, bool) {

	simpleURI := func(uri string) string {
		u, _ := url.Parse(uri)
		out := fmt.Sprintf("%s://%s%s", u.Scheme, u.Host, u.Path)
		return out
	}

	if info.URI == simpleURI(b.config.LeftURI) {
		return b.state.LeftInfo, true
	} else if info.URI == simpleURI(b.config.RightURI) {
		return b.state.RightInfo, true
	}

	return nil, false
}

// BothConnected returns true if both Endpoints have a connected status.
func (b *MemoryStateStore) BothConnected() bool {
	b.Lock()
	defer b.Unlock()
	return b.state.LeftInfo.Connected && b.state.RightInfo.Connected
}

// FileStateStore extends MemoryStore by storing the Status inside a file that stays open.
// It is used at restart to check if the last processing state was Idle, otherwise something may have been
// stopped in the middle and we trigger a full resync.
type FileStateStore struct {
	MemoryStateStore
	PreviousState model.TaskStatus
	FileError     error

	filePath   string
	fileState  chan model.TaskStatus
	done       chan bool
	fileClosed bool
}

// NewFileStateStore creates a FileStateStore with the state file in the target folder.
func NewFileStateStore(config *config.Task, folderPath string) *FileStateStore {
	m := NewMemoryStateStore(config)
	f := &FileStateStore{
		MemoryStateStore: *m,
		filePath:         filepath.Join(folderPath, "state"),
		fileState:        make(chan model.TaskStatus, 1),
		done:             make(chan bool, 1),
	}
	f.PreviousState = f.readLastState()
	if file, e := os.OpenFile(f.filePath, os.O_CREATE|os.O_WRONLY, 0755); e == nil {
		go f.listenToState(file)
	} else {
		f.FileError = e
	}
	return f
}

// UpdateSyncStatus stores the status in the state file
func (f *FileStateStore) UpdateSyncStatus(s model.TaskStatus) common.SyncState {
	if f.FileError == nil && f.state.Status != s {
		go func() {
			if !f.fileClosed {
				f.fileState <- s
			}
		}()
	}
	return f.MemoryStateStore.UpdateSyncStatus(s)
}

// UpdateProcessStatus stores the status in the state file
func (f *FileStateStore) UpdateProcessStatus(processStatus model.Status, status ...model.TaskStatus) common.SyncState {
	if f.FileError == nil && len(status) > 0 && f.state.Status != status[0] {
		go func() {
			if !f.fileClosed {
				f.fileState <- status[0]
			}
		}()
	}
	return f.MemoryStateStore.UpdateProcessStatus(processStatus, status...)
}

// Close closes the state file
func (f *FileStateStore) Close() {
	f.MemoryStateStore.Close()
	close(f.done)
}

func (f *FileStateStore) readLastState() model.TaskStatus {
	if bb, e := ioutil.ReadFile(f.filePath); e == nil {
		s := strings.Trim(string(bb), "\n")
		if i, er := strconv.Atoi(s); er == nil {
			return model.TaskStatus(i)
		}
	}
	return model.TaskStatusIdle
}

func (f *FileStateStore) listenToState(file *os.File) {
	defer func() {
		close(f.fileState)
	}()
	for {
		select {
		case s := <-f.fileState:
			st := strconv.Itoa(int(s))
			file.WriteAt([]byte(st), 0)
			file.Sync()
		case <-f.done:
			file.Close()
			f.fileClosed = true
			return
		}
	}
}
