package control

import (
	"context"
	"fmt"
	"net/http"
	"net/http/pprof"
	"os"

	"github.com/pydio/cells/common/log"
	servicecontext "github.com/pydio/cells/common/service/context"
)

type Profiler struct {
	ctx context.Context
}

func (p *Profiler) Serve() {
	p.ctx = servicecontext.WithServiceName(context.Background(), "profiler")
	p.ctx = servicecontext.WithServiceColor(p.ctx, servicecontext.ServiceColorOther)

	log.Logger(p.ctx).Info(fmt.Sprintf("Exposing debug profiles for process %d on port %d\n", os.Getpid(), 6060))
	http.Handle("/debug", pprof.Handler("debug"))
	http.ListenAndServe(fmt.Sprintf(":%v", 6060), nil)
	select {}
}

func (p *Profiler) Stop() {
	log.Logger(p.ctx).Info("Stopping profiler")
}
