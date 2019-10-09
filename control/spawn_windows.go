package control

import (
	"context"
	"os"
	"os/exec"
	"strconv"
	"syscall"
)

// killableSpawn explicity kills a process by PID on Windows
func killableSpawn(executable string, args []string) (*exec.Cmd, context.CancelFunc) {
	cmd := exec.Command(executable, args...)
	cancel := func() {
		kill := exec.Command("TASKKILL", "/T", "/F", "/PID", strconv.Itoa(cmd.Process.Pid))
		kill.Stderr = os.Stderr
		kill.Stdout = os.Stdout
		kill.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
		_ = kill.Run()
	}
	return cmd, cancel
}
