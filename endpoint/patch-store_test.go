package endpoint

import (
	"testing"

	"go.etcd.io/bbolt"

	"github.com/pydio/cells/v5/common/proto/tree"
	"github.com/pydio/cells/v5/common/sync/endpoints/memory"
	"github.com/pydio/cells/v5/common/sync/merger"
	"github.com/pydio/cells/v5/common/sync/model"
)

// v4ConflictOp is a conflict operation as serialized by cells-sync built on Cells v4: conflict
// details (ConflictType, LeftOp, RightOp) were not marshalled, so they cannot be restored.
const v4ConflictOp = `{"OpType":7,"Dir":0,"Node":{"Uuid":"uuid-a","Path":"folder/a.txt","Type":1,"Size":42,"MTime":1700000000,"Mode":420,"Etag":"etag-a","MetaStore":{"name":"\"a.txt\""}},"EventInfo":{"Time":"","Size":0,"Etag":"","Folder":false,"Path":"","Type":"","Host":"","Port":"","UserAgent":"","OperationId":"","ScanEvent":false,"ScanSourceNode":null,"Metadata":null,"MoveSource":null,"MoveTarget":null},"InternalStatus":null,"Processed":false,"ProcessingErrorString":""}`

// storeWithRawOps persists a patch holding one regular operation, then appends raw serialized
// operations to it, as if they had been written by a previous version.
func storeWithRawOps(t *testing.T, dir string, raw ...string) {
	l, r := memory.NewMemDB(), memory.NewMemDB()
	ps, err := NewPatchStore(dir, l, r)
	if err != nil {
		t.Fatal(err)
	}
	p := merger.NewPatch(l, r, merger.PatchOptions{})
	p.Enqueue(merger.NewOperation(merger.OpCreateFile, model.EventInfo{Path: "b"}, &tree.Node{Path: "b", Uuid: "ub", Type: tree.NodeType_LEAF}))
	ps.persist(p)
	err = ps.db.Update(func(tx *bbolt.Tx) error {
		ops := tx.Bucket(patchBucket).Bucket([]byte(p.GetUUID())).Bucket(opsKey)
		for _, data := range raw {
			id, _ := ops.NextSequence()
			if e := ops.Put(itob(id), []byte(data)); e != nil {
				return e
			}
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	ps.Stop()
}

func TestPatchStoreLoadsConflictsStoredByV4(t *testing.T) {
	dir := t.TempDir()
	storeWithRawOps(t, dir, v4ConflictOp)

	// NewPatchStore loads the last patch: it used to panic (patch.Enqueue(nil)), crashing the app at every start.
	ps, err := NewPatchStore(dir, memory.NewMemDB(), memory.NewMemDB())
	if err != nil {
		t.Fatal(err)
	}
	defer ps.Stop()
	patches, err := ps.Load(0, 10)
	if err != nil || len(patches) != 1 {
		t.Fatalf("expected 1 patch, got %d (err=%v)", len(patches), err)
	}
	var conflict merger.Operation
	for _, o := range patches[0].OperationsByType(nil) {
		if o.Type() == merger.OpConflict {
			conflict = o
		}
	}
	if conflict == nil {
		t.Fatal("v4 conflict operation should be kept, without its details")
	}
	if conflict.GetNode() == nil || conflict.GetNode().GetPath() != "folder/a.txt" {
		t.Fatalf("conflict node not restored: %v", conflict.GetNode())
	}
	if patches[0].Size() != 2 {
		t.Fatalf("expected 2 operations, got %d", patches[0].Size())
	}
}

func TestPatchStoreSkipsUndecodableOperations(t *testing.T) {
	dir := t.TempDir()
	storeWithRawOps(t, dir, `{"OpType":"not-a-number"}`, `not json`)

	ps, err := NewPatchStore(dir, memory.NewMemDB(), memory.NewMemDB())
	if err != nil {
		t.Fatal(err)
	}
	defer ps.Stop()
	patches, err := ps.Load(0, 10)
	if err != nil || len(patches) != 1 {
		t.Fatalf("expected 1 patch, got %d (err=%v)", len(patches), err)
	}
	if patches[0].Size() != 1 {
		t.Fatalf("expected only the valid operation to be loaded, got %d", patches[0].Size())
	}
}
