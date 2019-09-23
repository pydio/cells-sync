// +build windows

/*
 * Copyright (c) 2019. Abstrium SAS <team (at) pydio.com>
 * This file is part of Pydio Cells.
 *
 * Pydio Cells is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Pydio Cells is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Pydio Cells.  If not, see <http://www.gnu.org/licenses/>.
 *
 * The latest code can be found at <https://pydio.com>.
 */

package config

import (
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"

	"github.com/pydio/cells/common/log"
	"golang.org/x/net/context"
)

func ProcessName(name string) string {
	dir, _ := os.Getwd()
	if !strings.HasSuffix(name, ".exe") {
		name += ".exe"
	}
	if dir == filepath.Dir(name) {
		name = filepath.Base(name)
	}
	cwdFile := filepath.Join(SyncClientDataDir(), "cwd.txt")
	if data, e := ioutil.ReadFile(cwdFile); e == nil {
		dir = string(data)
		name = filepath.Base(name)
		log.Logger(context.Background()).Info("Loading CWD from file : " + dir)
	}
	return filepath.Join(dir, name)
}
