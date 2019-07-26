package tray

import (
	"context"
	"fmt"
	"os"
	"os/exec"
)

type CliService struct {
	cancel context.CancelFunc
}

func (c *CliService) Serve() {
	var ctx context.Context
	ctx, c.cancel = context.WithCancel(context.Background())
	cmd := exec.CommandContext(ctx, processName(os.Args[0]), "start")
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	fmt.Println("Starting service " + processName(os.Args[0]))
	if e := cmd.Run(); e != nil {
		fmt.Println("Error on service start")
		c.cancel = nil
		panic(e)
	}
}

func (c *CliService) Stop() {
	fmt.Println("Stopping Cli Service " + processName(os.Args[0]))
	if c.cancel != nil {
		c.cancel()
		c.cancel = nil
	}
}
