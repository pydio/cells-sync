// +build !windows

package control

import (
	"context"
	"os/exec"
)

func killableSpawn(executable string, args []string) (*exec.Cmd, context.CancelFunc) {
	ctx, cancel := context.WithCancel(context.Background())
	cmd := exec.CommandContext(ctx, executable, args...)
	return cmd, cancel
}
