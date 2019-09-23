package config

import "github.com/kardianos/service"

var ServiceConfig = &service.Config{
	Name:        "com.pydio.CellsSync",
	DisplayName: "Cells Sync",
	Description: "Synchronization tool for Pydio Cells",
	Arguments:   []string{"start", "--headless"},
	Option: map[string]interface{}{
		"RunAtLoad": true,
	},
}
