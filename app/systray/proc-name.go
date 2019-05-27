// +build !windows

package main

import (
	"os"
	"path/filepath"
)

func processName(name string) string {
	dir, _ := os.Getwd()
	return filepath.Join(dir, name)
}
