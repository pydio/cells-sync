package endpoint

import (
	"sync"

	"github.com/pydio/cells/common/sync/endpoints/snapshot"
	"github.com/pydio/cells/common/sync/model"
)

type SnapshotFactory struct {
	sync.Mutex
	snaps    map[string]model.Snapshoter
	uris     map[string]string
	syncUuid string
}

func NewSnapshotFactory(syncUuid string, left model.Endpoint, right model.Endpoint) model.SnapshotFactory {
	uris := map[string]string{
		left.GetEndpointInfo().URI:  "left",
		right.GetEndpointInfo().URI: "right",
	}
	return &SnapshotFactory{
		uris:     uris,
		snaps:    make(map[string]model.Snapshoter),
		syncUuid: syncUuid,
	}
}

func (f *SnapshotFactory) Load(source model.PathSyncSource) (model.Snapshoter, error) {
	f.Lock()
	defer f.Unlock()
	name := f.uris[source.GetEndpointInfo().URI]
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
