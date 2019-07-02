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

type SnapshotFactory struct {
	sync.Mutex
	snaps      map[string]model.Snapshoter
	uris       map[string]string
	configPath string
}

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
