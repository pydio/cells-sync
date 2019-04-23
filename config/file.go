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
	"encoding/json"
	"io/ioutil"
	"path/filepath"

	"github.com/pydio/cells/common/config"
)

func getPath() string {
	return filepath.Join(config.ApplicationDataDir(), "sync", "config.json")
}

func LoadFromFile() (*Global, error) {
	data, err := ioutil.ReadFile(getPath())
	if err != nil {
		return nil, err
	}
	g := Global{}
	if e := json.Unmarshal(data, &g); e == nil {
		return &g, nil
	} else {
		return nil, e
	}
}

func WriteToFile(config *Global) error {
	data, e := json.Marshal(config)
	if e != nil {
		return e
	}
	return ioutil.WriteFile(getPath(), data, 0755)
}
