package control

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"strings"

	"github.com/pydio/cells-sync/common"
)

type SpawnedService struct {
	args   []string
	cancel context.CancelFunc
}

func (c *SpawnedService) Serve() {
	var ctx context.Context
	ctx, c.cancel = context.WithCancel(context.Background())
	cmd := exec.CommandContext(ctx, common.ProcessName(os.Args[0]), c.args...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	fmt.Println("Starting service " + common.ProcessName(os.Args[0]))
	if e := cmd.Run(); e != nil {
		fmt.Println("Error on service " + strings.Join(c.args, " "))
		c.cancel = nil
		panic(e)
	}
}

func (c *SpawnedService) Stop() {
	fmt.Println("Stopping Cli Service " + common.ProcessName(os.Args[0]))
	if c.cancel != nil {
		c.cancel()
		c.cancel = nil
	}
}
