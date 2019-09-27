// +build !windows

package config

import (
	"os"
	"path/filepath"
)

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
