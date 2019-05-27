package ux

import (
	"path/filepath"

	"github.com/gobuffalo/packr"
)

var (
	Box *GinBox
)

// Small wrapper to adapt packr.Box
type GinBox struct {
	packr.Box
}

func (g *GinBox) Exists(prefix string, path string) bool {
	return g.Box.Has(filepath.Join(prefix, path))
}

func init() {
	pBox := packr.NewBox("./build")
	Box = &GinBox{
		Box: pBox,
	}
}
