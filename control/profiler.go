/*
 * Copyright 2019 Abstrium SAS
 *
 *  This file is part of Cells Sync.
 *
 *  Cells Sync is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  Cells Sync is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with Cells Sync.  If not, see <https://www.gnu.org/licenses/>.
 */

package control

import (
	"context"
	"fmt"
	"net/http"
	"net/http/pprof"
	"os"

	"github.com/pydio/cells/v4/common/log"
	servicecontext "github.com/pydio/cells/v4/common/service/context"
)

// Profiler is a supervisor service for serving internal golang pprof debugs on 6060
type Profiler struct {
	ctx context.Context
}

// Serve implements supervisor service interface.
func (p *Profiler) Serve() {
	p.ctx = servicecontext.WithServiceName(context.Background(), "profiler")

	log.Logger(p.ctx).Info(fmt.Sprintf("Exposing debug profiles for process %d on port %d\n", os.Getpid(), 6060))
	http.Handle("/debug", pprof.Handler("debug"))
	http.ListenAndServe(fmt.Sprintf(":%v", 6060), nil)
	select {}
}

// Stop implements supervisor service interface.
func (p *Profiler) Stop() {
	log.Logger(p.ctx).Info("Stopping profiler")
}
