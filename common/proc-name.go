// +build !windows

package common

import (
	"os"
	"path/filepath"
)

func ProcessName(name string) string {
	dir, _ := os.Getwd()
	return filepath.Join(dir, name)
}
