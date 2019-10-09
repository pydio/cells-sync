package config

import (
	"fmt"
	"runtime"

	"github.com/kardianos/service"
)

type ServiceCmd string

const ServiceCmdStart ServiceCmd = "start"
const ServiceCmdStop ServiceCmd = "stop"
const ServiceCmdRestart ServiceCmd = "restart"
const ServiceCmdInstall ServiceCmd = "install"
const ServiceCmdUninstall ServiceCmd = "uninstall"

type ServiceProgram struct {
	runner func()
}

// Start should not block. Do the actual work async.
func (p *ServiceProgram) Start(s service.Service) error {
	if p.runner != nil {
		go p.runner()
	}
	return nil
}

// Stop should not block. Return with a few seconds.
func (p *ServiceProgram) Stop(s service.Service) error {
	return nil
}

// GetAppService returns a usable kardianos Service.
func GetAppService(runner func()) (service.Service, error) {
	if ServiceConfig.Name == "" {
		return nil, fmt.Errorf("Background service is not supported on this OS")
	}
	prg := &ServiceProgram{runner: runner}
	return service.New(prg, ServiceConfig)
}

// ControlAppService sends a command to the service.
func ControlAppService(cmd ServiceCmd) error {
	if s, e := GetAppService(nil); e != nil {
		return e
	} else {
		return service.Control(s, string(cmd))
	}
}

// AllowedServiceCmd returns a list of acceptable commands for ControlAppService function.
func AllowedServiceCmd(s string) bool {
	for _, c := range []string{"start", "stop", "restart", "install", "uninstall"} {
		if c == s {
			return true
		}
	}
	return false
}

// NotRunningAsService overrides service.Interactive() function by additionally checking if service
// is really installed, as on MacOS the .app is launched by "launchd" just like the service.
func NotRunningAsService() bool {
	return service.Interactive() || (runtime.GOOS == "darwin" && !ServiceInstalled())
}

// ServiceInstalled checks if background service is installed.
func ServiceInstalled() bool {
	s, e := GetAppService(nil)
	if e != nil {
		return false
	}
	if status, err := s.Status(); err == nil {
		return status != service.StatusUnknown
	}
	return false
}

// Status returns the status of the background service.
func Status() (service.Status, error) {
	s, e := GetAppService(nil)
	if e != nil {
		return service.StatusUnknown, e
	}
	return s.Status()
}
