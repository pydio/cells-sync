package config

import (
	"strconv"
	"os"
	"os/user"
	"path/filepath"
	"runtime"
	"text/template"
)

type ShortcutOptions struct {
	Shortcut  bool
	AutoStart bool
}

type ShortcutInstaller interface {
	Install(options ShortcutOptions) error
	Uninstall() error
}

func GetOSShortcutInstaller() ShortcutInstaller {
	if runtime.GOOS != "linux" {
		return nil
	}
	// TODO : DETECT SPECIFIC DISTRO => READ UBUNTU INSIDE /etc/os-release file ?
	return &ubuntuInstaller{}
}

type ubuntuInstaller struct{}

const ubuntuAppTpl = `[Desktop Entry]
Name={{.Name}}
Comment={{.Description}}
Exec={{.Executable}}
Type=Application
Terminal=false
Type=Application
StartupNotify=true`

const ubuntuStartTpl = `[Desktop Entry]
Name={{.Name}}
Comment={{.Description}}
Exec={{.Executable}}
Type=Application
Terminal=false
Type=Application
StartupNotify=true
OnlyShowIn=GNOME;Unity;
NoDisplay=false
X-GNOME-Autostart-enabled=true
`

type ubuntuTplConf struct {
	Name        string
	Description string
	Executable  string
}

func (u ubuntuInstaller) Install(options ShortcutOptions) error {
	cwd, _ := os.Getwd()
	conf := &ubuntuTplConf{
		Name:        "Cells Sync",
		Description: "Synchronization client for Pydio Cells",
		Executable:  filepath.Join(cwd, "cells-sync") + " systray",
	}
	if options.Shortcut {
		tpl := template.New("app")
		t, _ := tpl.Parse(ubuntuAppTpl)
		filePath := "/usr/share/applications/cells-sync.desktop"
		if _, err := os.Stat(filePath); os.IsNotExist(err) {
			_, e := os.Create(filePath)
			if e != nil {
				return e
			}
		}
		if target, e := os.OpenFile("/usr/share/applications/cells-sync.desktop", os.O_WRONLY, 0755); e == nil {
			if er := t.Execute(target, conf); er != nil {
				return er
			}
		} else {
			return e
		}
	}
	if options.AutoStart {
		tpl := template.New("start")
		t, _ := tpl.Parse(ubuntuStartTpl)
		uname := os.Getenv("SUDO_USER")
		var us *user.User
		isSudo := false
		if uname == "" {
			us, _ = user.Current()			
		}else{
			us, _ = user.Lookup(uname)
			isSudo = true
		}

		filePath := filepath.Join(us.HomeDir, ".config", "autostart", "cells-sync.desktop")
		if _, err := os.Stat(filePath); os.IsNotExist(err) {
			_, e := os.Create(filePath)
			if e != nil {
				return e
			}
		}

		if target, e := os.OpenFile(filePath, os.O_WRONLY, 0755); e == nil {
			if er := t.Execute(target, conf); er != nil {
				return er
			}
			if isSudo {
				uid, _ := strconv.Atoi(us.Uid)
				gid, _ := strconv.Atoi(us.Gid)
				_ = os.Chown(filePath, uid, gid)
			}
		} else {
			return e
		}
	}
	return nil
}

func (u ubuntuInstaller) Uninstall() error {
	us, e := user.Current()
	if e != nil {
		return e
	}
	os.Remove(filepath.Join(us.HomeDir, ".config", "autostart", "cells-sync.desktop"))
	os.Remove("/usr/share/applications/cells-sync.desktop")
	return nil
}
