// +build !windows

package common

import (
	"os"
	"path/filepath"
)

func ProcessName(name string) string {
	dir, _ := os.Getwd()
	if dir == filepath.Dir(name) {
		name = filepath.Base(name)
	}
	return filepath.Join(dir, name)
}
