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
	"encoding/json"
	"os"
	"path/filepath"
)

func getPath() string {
	return filepath.Join(SyncClientDataDir(), "config.json")
}

// LoadFromFile loads a Global config from a JSON file.
func LoadFromFile() (*Global, error) {
	data, err := os.ReadFile(getPath())
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

// WriteToFile stores a Global config JSON-encoded.
func WriteToFile(config *Global) error {
	data, e := json.Marshal(config)
	if e != nil {
		return e
	}
	return os.WriteFile(getPath(), data, 0755)
}
