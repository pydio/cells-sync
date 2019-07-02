package endpoint

import (
	"context"
	"encoding/binary"
	"encoding/json"
	"os"
	"path/filepath"
	"sort"
	"time"

	"github.com/etcd-io/bbolt"

	"github.com/pydio/cells/common/config"
	"github.com/pydio/cells/common/log"
	"github.com/pydio/cells/common/sync/merger"
	"github.com/pydio/cells/common/sync/model"
)

var (
	patchBucket = []byte("patches")
	timeKey     = []byte("stamp")
	opsKey      = []byte("operations")
)

type patchSorter []merger.Patch

func (p patchSorter) Len() int {
	return len(p)
}
func (p patchSorter) Less(i, j int) bool {
	return p[i].GetStamp().After(p[j].GetStamp())
}
func (p patchSorter) Swap(i, j int) {
	p[i], p[j] = p[j], p[i]
}

type PatchStore struct {
	patches  chan merger.Patch
	done     chan bool
	pipeDone chan bool

	source model.Endpoint
	target model.Endpoint

	db         *bbolt.DB
	folderPath string
}

func NewPatchStore(syncUUID string, source model.Endpoint, target model.Endpoint) (*PatchStore, error) {
	p := &PatchStore{
		patches: make(chan merger.Patch),
		done:    make(chan bool, 1),
		source:  source,
		target:  target,
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

func (p *PatchStore) Load(offset, limit int) (patches []merger.Patch, e error) {
	var stamps patchSorter

	e = p.db.View(func(tx *bbolt.Tx) error {
		bucket := tx.Bucket(patchBucket)
		if bucket == nil {
			return nil
		}
		c := bucket.Cursor()
		for k, _ := c.First(); k != nil; k, _ = c.Next() {
			patch := merger.NewPatch(p.source.(model.PathSyncSource), p.target.(model.PathSyncTarget), merger.PatchOptions{})
			// Set the UUID of the patch
			patch.SetUUID(string(k))
			// v is a bucket containing all operations
			patchBucket := bucket.Bucket(k)
			stamp := patchBucket.Get(timeKey)
			t := time.Now()
			if err := t.UnmarshalJSON(stamp); err == nil {
				patch.Stamp(t)
			}
			opsBucket := patchBucket.Bucket(opsKey)
			oc := opsBucket.Cursor()
			for _, v := oc.First(); v != nil; _, v = oc.Next() {
				operation := merger.NewOpForUnmarshall()
				if err := json.Unmarshal(v, &operation); err == nil {
					patch.Enqueue(operation)
				}
			}
			stamps = append(stamps, patch)
		}
		return nil
	})
	if e != nil {
		return patches, e
	}
	// Order patches by timestamp
	sort.Sort(stamps)
	var prunes []string
	if len(stamps) > 100 {
		for _, pr := range stamps[100:] {
			prunes = append(prunes, pr.GetUUID())
		}
	}
	for i, patch := range stamps {
		if i < offset {
			continue
		}
		patches = append(patches, patch)
		if i >= offset+limit-1 {
			break
		}
	}

	if len(prunes) > 0 {
		go func() {
			log.Logger(context.Background()).Info("Pruning patch store")
			p.db.Update(func(tx *bbolt.Tx) error {
				bucket := tx.Bucket(patchBucket)
				if bucket == nil {
					return nil
				}
				for _, uuid := range prunes {
					if e := bucket.DeleteBucket([]byte(uuid)); e != nil {
						log.Logger(context.Background()).Error("cannot delete bucket " + uuid + " - " + e.Error())
					}
				}
				return nil
			})
		}()
	}

	return
}

func (p *PatchStore) Stop() {
	close(p.done)
	if p.pipeDone != nil {
		close(p.pipeDone)
	}
	p.db.Close()
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
		// Fully replace bucket content
		bName := []byte(patch.GetUUID())
		if opsBucket := bucket.Bucket(bName); opsBucket != nil {
			bucket.DeleteBucket(bName)
		}
		patchBucket, err := bucket.CreateBucketIfNotExists(bName)
		if err != nil {
			return err
		}
		mTime, _ := patch.GetStamp().MarshalJSON()
		patchBucket.Put(timeKey, mTime)
		opsBucket, _ := patchBucket.CreateBucket(opsKey)
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
