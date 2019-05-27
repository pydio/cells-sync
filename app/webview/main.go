package main

import (
	"os"

	"github.com/zserge/webview"
)

func main() {

	url := "http://localhost:3636"
	if len(os.Args) > 1 {
		url = os.Args[1]
	}

	w := webview.New(webview.Settings{
		Height:    800,
		Width:     800,
		Resizable: true,
		Title:     "Cells Sync",
		URL:       url,
	})
	w.Run()

}
