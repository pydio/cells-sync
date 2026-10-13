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
	"errors"
	"testing"

	"github.com/pydio/cells-sync/config"
	"github.com/pydio/cells/v5/common/proto/tree"
	"github.com/pydio/cells/v5/common/sync/endpoints/memory"
	"github.com/pydio/cells/v5/common/sync/merger"
	"github.com/pydio/cells/v5/common/sync/model"
)

// CS-N1: after a failed run, a restart (or a reconnection) must still start a run when both sides connect.
func TestRunOnConnect(t *testing.T) {
	for status, want := range map[model.TaskStatus]bool{
		model.TaskStatusIdle:       true,
		model.TaskStatusError:      true,
		model.TaskStatusPaused:     false,
		model.TaskStatusDisabled:   false,
		model.TaskStatusProcessing: false,
	} {
		if got := runOnConnect(status); got != want {
			t.Errorf("runOnConnect(%v) = %v, want %v", status, got, want)
		}
	}
}

// CS-N2: the loop re-applies the last patch only when some of its operations failed. A patch with conflicts, or
// whose diff failed, is stale: re-applying it replays conflicts the user may have resolved since.
func TestReApplyLastPatch(t *testing.T) {
	node := func(p string) *tree.Node { return &tree.Node{Path: p, Type: tree.NodeType_LEAF} }
	create := func(p string) merger.Operation {
		return merger.NewOperation(merger.OpCreateFile, model.EventInfo{Path: p}, node(p))
	}
	newPatch := func(ops ...merger.Operation) merger.Patch {
		patch := merger.NewPatch(memory.NewMemDB(), memory.NewMemDB(), merger.PatchOptions{})
		for _, o := range ops {
			patch.Enqueue(o)
		}
		return patch
	}

	failed := create("a")
	failedPatch := newPatch(failed)
	failed.Status(model.NewProcessingStatus("transfer failed").SetError(errors.New("connection reset")))

	conflictPatch := newPatch(create("b"), merger.NewConflictOperation(node("c"), merger.ConflictFileContent, create("c"), create("c")))
	_ = conflictPatch.SetPatchError(errors.New("diff has conflicts"))

	diffErrorPatch := newPatch()
	_ = diffErrorPatch.SetPatchError(errors.New("error happened during diff.Compute"))

	for name, tc := range map[string]struct {
		patch merger.Patch
		want  bool
	}{
		"no previous patch":  {nil, false},
		"successful patch":   {newPatch(create("d")), false},
		"failed operations":  {failedPatch, true},
		"conflicts":          {conflictPatch, false},
		"diff error, no ops": {diffErrorPatch, false},
	} {
		if got := reApplyLastPatch(tc.patch); got != tc.want {
			t.Errorf("%s: reApplyLastPatch = %v, want %v", name, got, tc.want)
		}
	}
}

// CS-N3: the "Idle" status set a few seconds after a patch must not overwrite a pause (or a run) that happened since.
func TestResetToIdleKeepsLaterStatus(t *testing.T) {
	s := &Syncer{stateStore: NewMemoryStateStore(&config.Task{})}
	s.stateStore.UpdateProcessStatus(model.NewProcessingStatus("Finished Processing 7 files and folders"), model.TaskStatusIdle)

	// Paused after the patch finished
	s.taskPaused.Store(true)
	s.stateStore.UpdateSyncStatus(model.TaskStatusPaused)
	s.resetToIdle()
	if st := s.stateStore.LastState().Status; st != model.TaskStatusPaused {
		t.Fatalf("pause overwritten by the deferred idle status: %v", st)
	}

	// Resumed, and a new patch is processing
	s.taskPaused.Store(false)
	s.stateStore.UpdateSyncStatus(model.TaskStatusProcessing)
	s.resetToIdle()
	if st := s.stateStore.LastState().Status; st != model.TaskStatusProcessing {
		t.Fatalf("running patch overwritten by the deferred idle status: %v", st)
	}

	// Nothing happened since
	s.stateStore.UpdateSyncStatus(model.TaskStatusIdle)
	s.resetToIdle()
	if st := s.stateStore.LastState().Status; st != model.TaskStatusIdle {
		t.Fatalf("expected idle, got %v", st)
	}
}
