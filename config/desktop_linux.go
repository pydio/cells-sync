package config

import (
	"os"
	"os/user"
	"path/filepath"
	"text/template"
)

func GetOSShortcutInstaller() ShortcutInstaller {
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

// Install will install .desktop files under /usr/share/applications/ and ${HOME}/.config/autostart on Linux.
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
		if target, e := os.OpenFile("/usr/share/applications/cells-sync.desktop", os.O_WRONLY|os.O_CREATE, 0755); e == nil {
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
		us, _ := user.Current()
		if target, e := os.OpenFile(filepath.Join(us.HomeDir, ".config", "autostart", "cells-sync.desktop"), os.O_WRONLY|os.O_CREATE, 0755); e == nil {
			if er := t.Execute(target, conf); er != nil {
				return er
			}
		} else {
			return e
		}
	}
	return nil
}

// Uninstall removes .desktop files on Linux.
func (u ubuntuInstaller) Uninstall() error {
	us, e := user.Current()
	if e != nil {
		return e
	}
	os.Remove(filepath.Join(us.HomeDir, ".config", "autostart", "cells-sync.desktop"))
	os.Remove("/usr/share/applications/cells-sync.desktop")
	return nil
}

// IsInstall looks for user .desktop file under ${HOME}/.config/autostart folder.
func (u ubuntuInstaller) IsInstalled() bool {
	us, e := user.Current()
	if e != nil {
		return false
	}
	_, e = os.Stat(filepath.Join(us.HomeDir, ".config", "autostart", "cells-sync.desktop"))
	return e == nil
}
