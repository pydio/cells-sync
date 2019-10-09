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

package endpoint

import (
	"context"
	"os"
	"path/filepath"
	"sync"

	"github.com/pydio/cells/common/log"

	"github.com/pydio/cells/common/sync/endpoints/snapshot"
	"github.com/pydio/cells/common/sync/model"
)

// SnapshotFactory implements model.SnapshotProvider interface for persisting snapshots in a BoltDB.
type SnapshotFactory struct {
	sync.Mutex
	snaps      map[string]model.Snapshoter
	uris       map[string]string
	configPath string
}

// NewSnapshotFactory opens a new SnapshotFactory.
func NewSnapshotFactory(configPath string, left model.Endpoint, right model.Endpoint) model.SnapshotFactory {
	uris := map[string]string{
		left.GetEndpointInfo().URI:  "left",
		right.GetEndpointInfo().URI: "right",
	}
	return &SnapshotFactory{
		uris:       uris,
		snaps:      make(map[string]model.Snapshoter),
		configPath: configPath,
	}
}

// Load creates or loads an existing snapshot from within the application dir
func (f *SnapshotFactory) Load(source model.PathSyncSource) (model.Snapshoter, error) {
	f.Lock()
	defer f.Unlock()
	name := f.uris[source.GetEndpointInfo().URI]
	if s, ok := f.snaps[name]; ok {
		return s, nil
	}

	s, e := snapshot.NewBoltSnapshot(f.configPath, name)
	if e != nil {
		return nil, e
	}
	f.snaps[name] = s
	return s, nil
}

// Close closes the BoltDB.
func (f *SnapshotFactory) Close(ctx context.Context) error {
	for _, name := range []string{"left", "right"} {
		if s, ok := f.snaps[name]; ok {
			log.Logger(ctx).Info("Closing snapshot " + name)
			s.(*snapshot.BoltSnapshot).Close()
		}
	}
	return nil
}

// Reset clears all snapshots (left and right)
func (f *SnapshotFactory) Reset(ctx context.Context) error {

	for _, name := range []string{"left", "right"} {
		if s, ok := f.snaps[name]; ok {
			log.Logger(ctx).Info("Closing and clearing snapshot " + name)
			s.(*snapshot.BoltSnapshot).Close()
			if e := os.Remove(filepath.Join(f.configPath, "snapshot-"+name)); e != nil {
				return e
			}
		}
	}
	return nil

}
