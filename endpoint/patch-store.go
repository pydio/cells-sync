package endpoint

import (
	"encoding/binary"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/pydio/cells/common/sync/model"

	"github.com/etcd-io/bbolt"

	"github.com/pydio/cells/common/config"
	"github.com/pydio/cells/common/sync/merger"
)

var (
	patchBucket = []byte("patches")
)

type PatchStore struct {
	patches  chan merger.Patch
	done     chan bool
	pipeDone chan bool

	db         *bbolt.DB
	folderPath string
}

func NewPatchStore(syncUUID string) (*PatchStore, error) {
	p := &PatchStore{
		patches: make(chan merger.Patch),
		done:    make(chan bool, 1),
	}

	options := bbolt.DefaultOptions
	options.Timeout = 5 * time.Second
	appDir := config.ApplicationDataDir()
	p.folderPath = filepath.Join(appDir, "sync", syncUUID)
	os.MkdirAll(p.folderPath, 0755)
	dbPath := filepath.Join(p.folderPath, "patches")
	db, err := bbolt.Open(dbPath, 0644, options)
	if err != nil {
		return nil, err
	}
	p.db = db

	go func() {
		for patch := range p.patches {
			p.persist(patch)
		}
	}()
	return p, nil
}

func (p *PatchStore) Store(patch merger.Patch) {
	p.patches <- patch
}

func (p *PatchStore) Load(source model.Endpoint, target model.Endpoint) (patches []merger.Patch) {
	src := source.(model.PathSyncSource)
	trg := target.(model.PathSyncTarget)

	p.db.View(func(tx *bbolt.Tx) error {
		bucket := tx.Bucket(patchBucket)
		if bucket == nil {
			return nil
		}
		c := bucket.Cursor()
		for k, _ := c.First(); k != nil; k, _ = c.Next() {
			patch := merger.NewPatch(src, trg, merger.PatchOptions{})
			// v is a bucket containing all operations
			opsBucket := bucket.Bucket(k)
			oc := opsBucket.Cursor()
			for _, v := oc.First(); v != nil; _, v = oc.Next() {
				operation := merger.NewOpForUnmarshall()
				if err := json.Unmarshal(v, &operation); err == nil {
					patch.Enqueue(operation)
				} else {
					fmt.Println(err)
				}
			}
			patches = append(patches, patch)
			stats := patch.Stats()
			fmt.Println("Loaded patch with stats", stats)
		}
		return nil
	})
	return
}

func (p *PatchStore) Stop() {
	close(p.done)
	if p.pipeDone != nil {
		close(p.pipeDone)
	}
}

func (p *PatchStore) Pipe(in chan merger.Patch) chan merger.Patch {
	out := make(chan merger.Patch)
	p.pipeDone = make(chan bool, 1)
	go func() {
		defer close(out)
		for {
			select {
			case patch := <-out:
				p.patches <- patch
				in <- patch
			case <-p.pipeDone:
				return
			}
		}
	}()
	return out
}

func (p PatchStore) persist(patch merger.Patch) {
	if patch.Size() == 0 {
		return // Do not store empty patch!
	}
	p.db.Update(func(tx *bbolt.Tx) error {
		bucket, err := tx.CreateBucketIfNotExists(patchBucket)
		if err != nil {
			return err
		}
		opsBucket, err := bucket.CreateBucketIfNotExists([]byte(patch.GetUUID()))
		if err != nil {
			return err
		}
		patch.WalkOperations([]merger.OperationType{}, func(operation merger.Operation) {
			if data, err := json.Marshal(operation); err == nil {
				id, _ := opsBucket.NextSequence()
				opsBucket.Put(itob(id), data)
			}
		})
		return nil
	})
}

// itob returns an 8-byte big endian representation of v.
func itob(v uint64) []byte {
	b := make([]byte, 8)
	binary.BigEndian.PutUint64(b, v)
	return b
}
