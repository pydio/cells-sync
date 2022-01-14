package app

import (
	"embed"
	"io/fs"
)

var (
	//go:embed ux/src/i18n/*.json
	files  embed.FS
	I18nFS fs.FS
)

func init() {
	I18nFS, _ = fs.Sub(files, "ux/src/i18n")
}
