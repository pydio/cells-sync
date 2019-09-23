package config

import "github.com/kardianos/service"

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

func GetAppService(runner func()) (service.Service, error) {
	prg := &ServiceProgram{runner: runner}
	return service.New(prg, ServiceConfig)
}

func ControlAppService(cmd ServiceCmd) error {
	if s, e := GetAppService(nil); e != nil {
		return e
	} else {
		return service.Control(s, string(cmd))
	}
}

func AllowedServiceCmd(s string) bool {
	for _, c := range []string{"start", "stop", "restart", "install", "uninstall"} {
		if c == s {
			return true
		}
	}
	return false
}

func IsInstalled() bool {
	s, e := GetAppService(nil)
	if e != nil {
		return false
	}
	if status, err := s.Status(); err == nil {
		return status != service.StatusUnknown
	}
	return false
}

func Status() (service.Status, error) {
	s, e := GetAppService(nil)
	if e != nil {
		return service.StatusUnknown, e
	}
	return s.Status()
}
