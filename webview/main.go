package main

import "github.com/zserge/webview"

func main() {
	w := webview.New(webview.Settings{
		Height:    800,
		Width:     800,
		Resizable: true,
		Title:     "Cells Sync",
		URL:       "http://localhost:3636",
	})
	w.Run()

}
