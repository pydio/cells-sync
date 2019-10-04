package control

import (
	"bufio"
	"context"
	"os"
	"os/exec"
	"runtime"
	"strconv"
	"strings"

	"github.com/pydio/cells-sync/config"
	servicecontext "github.com/pydio/cells/common/service/context"

	"github.com/pydio/cells/common/log"
)

type SpawnedService struct {
	name   string
	args   []string
	cancel context.CancelFunc
	logCtx context.Context
}

func NewSpawnedService(name string, args []string) *SpawnedService {
	s := &SpawnedService{
		name: name,
		args: args,
	}
	ctx := servicecontext.WithServiceName(context.Background(), name)
	ctx = servicecontext.WithServiceColor(ctx, servicecontext.ServiceColorOther)
	s.logCtx = ctx
	return s
}

func (c *SpawnedService) Serve() {
	var ctx context.Context
	log.Logger(c.logCtx).Info("Starting sub-process with args " + strings.Join(c.args, " "))
	ctx, c.cancel = context.WithCancel(c.logCtx)
	pName := config.ProcessName(os.Args[0])
	//pName = "C:\\Users\\pydio\\go\\src\\github.com\\pydio\\cells-sync\\cells-sync.exe"
	cmd := exec.CommandContext(ctx, pName, c.args...)
	if runtime.GOOS == "windows" {
		// Replace cancel function with a hard kill
		c.cancel = func() {
			kill := exec.Command("TASKKILL", "/T", "/F", "/PID", strconv.Itoa(cmd.Process.Pid))
			kill.Stderr = os.Stderr
			kill.Stdout = os.Stdout
			//TODO in a win only file
			//kill.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
			_ = kill.Run()
		}
	}
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return // PRINT SOMETHING
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return // PRINT SOMETHING
	}
	scannerOut := bufio.NewScanner(stdout)
	go func() {
		for scannerOut.Scan() {
			text := strings.TrimRight(scannerOut.Text(), "\n")
			log.Logger(c.logCtx).Info(text)
		}
	}()
	scannerErr := bufio.NewScanner(stderr)
	go func() {
		for scannerErr.Scan() {
			text := strings.TrimRight(scannerErr.Text(), "\n")
			log.Logger(c.logCtx).Error(text)
		}
	}()
	if e := cmd.Run(); e != nil && !strings.Contains(e.Error(), "killed") {
		log.Logger(c.logCtx).Error("Error on sub process : " + e.Error())
		c.cancel = nil
		panic(e)
	}
}

func (c *SpawnedService) Stop() {
	if c.cancel != nil {
		c.cancel()
		c.cancel = nil
	}
}
