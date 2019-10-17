package tray

import (
	"os/exec"
	"runtime"
	"strings"

	coloricon "github.com/pydio/cells-sync/app/tray/color/icon"
	coloractive "github.com/pydio/cells-sync/app/tray/color/iconactive"
	coloractive2 "github.com/pydio/cells-sync/app/tray/color/iconactive2"
	colorerror "github.com/pydio/cells-sync/app/tray/color/iconerror"
	colorpause "github.com/pydio/cells-sync/app/tray/color/iconpause"

	darkicon "github.com/pydio/cells-sync/app/tray/dark/icon"
	darkactive "github.com/pydio/cells-sync/app/tray/dark/iconactive"
	darkactive2 "github.com/pydio/cells-sync/app/tray/dark/iconactive2"
	darkerror "github.com/pydio/cells-sync/app/tray/dark/iconerror"
	darkpause "github.com/pydio/cells-sync/app/tray/dark/iconpause"

	lighticon "github.com/pydio/cells-sync/app/tray/light/icon"
	lightactive "github.com/pydio/cells-sync/app/tray/light/iconactive"
	lightactive2 "github.com/pydio/cells-sync/app/tray/light/iconactive2"
	lighterror "github.com/pydio/cells-sync/app/tray/light/iconerror"
	lightpause "github.com/pydio/cells-sync/app/tray/light/iconpause"
)

var (
	iconData        = coloricon.Data
	iconActiveData  = coloractive.Data
	iconActive2Data = coloractive2.Data
	iconErrorData   = colorerror.Data
	iconPauseData   = colorpause.Data
)

func init() {
	if runtime.GOOS == "darwin" {
		useLightIcons := false
		cmd := exec.Command("defaults", "read", "-g", "AppleInterfaceStyle")
		if output, err := cmd.Output(); err == nil {
			if strings.Contains(string(output), "Dark") {
				useLightIcons = true
			}
		}
		if useLightIcons {
			iconData = lighticon.Data
			iconActiveData = lightactive.Data
			iconActive2Data = lightactive2.Data
			iconErrorData = lighterror.Data
			iconPauseData = lightpause.Data
		} else {
			iconData = darkicon.Data
			iconActiveData = darkactive.Data
			iconActive2Data = darkactive2.Data
			iconErrorData = darkerror.Data
			iconPauseData = darkpause.Data
		}
	}
}
