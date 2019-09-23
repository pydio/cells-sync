package config

import (
	"os/user"

	"github.com/kardianos/service"
)

var ServiceConfig = &service.Config{
	Name:        "com.pydio.CellsSync",
	DisplayName: "Cells Sync",
	Description: "Synchronization tool for Pydio Cells",
	Arguments:   []string{"start", "--headless"},
	Option: map[string]interface{}{
		"RunAtLoad": true,
	},
}

func init() {
	u, _ := user.Current()
	ServiceConfig.UserName = u.Username
}
