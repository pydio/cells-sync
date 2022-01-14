package ux

import (
	"embed"
	"io/fs"
	"net/http"
	"path/filepath"
)

var (
	Box *GinBox
	//go:embed build
	BuildFS embed.FS
)

// Small wrapper to adapt packr.Box
type GinBox struct {
	http.FileSystem
}

// Exists checks if a file exist inside embedded box
func (g *GinBox) Exists(prefix string, path string) bool {
	if f, e := g.Open(filepath.Join(prefix, path)); e == nil {
		_ = f.Close()
		return true
	}
	return false
}

func init() {
	sub, _ := fs.Sub(BuildFS, "build")
	Box = &GinBox{
		FileSystem: http.FS(sub),
	}
}
