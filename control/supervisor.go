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

// Package control provides a set of Services (in the Supervisor terminology) that are started
// by the main sync process.
package control

import (
	"context"
	"fmt"
	"os"
	"runtime"
	"sync"
	"time"

	"github.com/kardianos/service"
	"github.com/thejerf/suture"

	"github.com/pydio/cells-sync/config"
	"github.com/pydio/cells/common/log"
	servicecontext "github.com/pydio/cells/common/service/context"
)

// Supervisor is a service manager for starting syncs and other services and restarting them if necessary
type Supervisor struct {
	sync.Mutex
	*suture.Supervisor

	ctx            context.Context
	tasksTokens    map[string]suture.ServiceToken
	schedulerToken suture.ServiceToken
	noUi           bool
}

// NewSupervisor creates a new Supervisor
func NewSupervisor(noUi bool) *Supervisor {
	ctx := servicecontext.WithServiceName(context.Background(), "supervisor")
	ctx = servicecontext.WithServiceColor(ctx, servicecontext.ServiceColorRest)
	s := &Supervisor{
		ctx:         ctx,
		noUi:        noUi,
		tasksTokens: make(map[string]suture.ServiceToken),
		Supervisor: suture.New("cells-sync", suture.Spec{
			Log: func(s string) {
				log.Logger(ctx).Info(s)
			},
		}),
	}
	return s
}

// Serve starts all services and start listening to config and bus
// The call is blocking until all services are stopped
func (s *Supervisor) Serve() error {
	httpServer := NewHttpServer()
	conf := config.Default()
	if len(conf.Tasks) > 0 {
		for _, t := range conf.Tasks {
			syncer := NewSyncer(t)
			s.tasksTokens[t.Uuid] = s.Add(syncer)
		}
	}

	s.schedulerToken = s.Add(NewScheduler(conf.Tasks))
	s.Add(&Profiler{})
	if service.Interactive() && runtime.GOOS != "windows" && os.Getenv("CELLS_SYNC_IN_PATH") == "" {
		s.Add(&StdInner{})
	}
	if !s.noUi {
		addr, _ := config.GetHttpAddress()
		s.Add(NewSpawnedService("systray", []string{"systray", "--url", fmt.Sprintf("%s://%s", config.GetHttpProtocol(), addr)}))
	}
	s.Add(httpServer)
	s.Add(NewUpdater())

	go s.listenBus()
	go s.listenConfig()
	// Blocks here
	s.Supervisor.Serve()
	return nil
}

func (s *Supervisor) listenConfig() {
	c := config.Watch()
	for event := range c {
		if taskChange, ok := event.(*config.TaskChange); ok {
			// Restart Scheduler
			s.Remove(s.schedulerToken)
			allTasks := config.Default().Tasks
			s.schedulerToken = s.Add(NewScheduler(allTasks))

			// Start/stop sync tasks
			if taskChange.Type == "create" {
				log.Logger(s.ctx).Info("Starting New Task " + taskChange.Task.Uuid)
				t := s.Add(NewSyncer(taskChange.Task))
				s.Lock()
				s.tasksTokens[taskChange.Task.Uuid] = t
				s.Unlock()
			} else if taskChange.Type == "update" {
				s.Lock()
				token, ok := s.tasksTokens[taskChange.Task.Uuid]
				s.Unlock()
				if ok {
					log.Logger(s.ctx).Info("Restarting Task " + taskChange.Task.Uuid)
					GetBus().Pub(MessageRestartClean, TopicSync_+taskChange.Task.Uuid)
					s.Remove(token)
					log.Logger(s.ctx).Info("Removed from Supervisor" + taskChange.Task.Uuid)
					<-time.After(5 * time.Second)
				}
				log.Logger(s.ctx).Info("Starting Task " + taskChange.Task.Uuid)
				t := s.Add(NewSyncer(taskChange.Task))
				s.Lock()
				s.tasksTokens[taskChange.Task.Uuid] = t
				s.Unlock()
			} else if taskChange.Type == "remove" {
				s.Lock()
				token, ok := s.tasksTokens[taskChange.Task.Uuid]
				s.Unlock()
				if ok {
					log.Logger(s.ctx).Info("Removing Task " + taskChange.Task.Uuid)
					GetBus().Pub(MessageHaltClean, TopicSync_+taskChange.Task.Uuid)
					s.Remove(token)
					log.Logger(s.ctx).Info("Removed from Supervisor" + taskChange.Task.Uuid)
					s.Lock()
					delete(s.tasksTokens, taskChange.Task.Uuid)
					s.Unlock()
				}
			}
		}
	}
}

func (s *Supervisor) listenBus() {
	c := GetBus().Sub(TopicGlobal)
	for m := range c {
		if m == MessageHalt {
			if service.Interactive() {
				s.Stop()
			} else {
				config.ControlAppService(config.ServiceCmdStop)
			}
		}
	}
}
