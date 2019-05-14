package endpoint

import (
	"sync"

	"github.com/pydio/cells/common/sync/endpoints/snapshot"
	"github.com/pydio/cells/common/sync/model"
)

type SnapshotFactory struct {
	sync.Mutex
	snaps    map[string]model.Snapshoter
	syncUuid string
}

func NewSnapshotFactory(syncUuid string) model.SnapshotFactory {
	return &SnapshotFactory{
		snaps:    make(map[string]model.Snapshoter),
		syncUuid: syncUuid,
	}
}

func (f *SnapshotFactory) Load(name string) (model.Snapshoter, error) {
	f.Lock()
	defer f.Unlock()
	if s, ok := f.snaps[name]; ok {
		return s, nil
	}
	s, e := snapshot.NewBoltSnapshot(name, f.syncUuid)
	if e != nil {
		return nil, e
	}
	f.snaps[name] = s
	return s, nil
}
