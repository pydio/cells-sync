// +build !windows

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

package config

import (
	"os"
	"path/filepath"
)

// ProcessName computes the actual path to current process.
func ProcessName(name string) string {
	if os.Getenv("CELLS_SYNC_IN_PATH") == "true" {
		return name
	}
	dir, _ := os.Getwd()
	if dir == filepath.Dir(name) {
		name = filepath.Base(name)
	}
	return filepath.Join(dir, name)
}
