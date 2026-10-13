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
	"testing"

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
