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

	"github.com/pydio/cells-sync/config"
	"github.com/pydio/cells/common/log"
	servicecontext "github.com/pydio/cells/common/service/context"
	"github.com/pydio/cells/common/utils/schedule"
)

// Scheduler is a supervisor service emitting various commands on a timely manner.
type Scheduler struct {
	tasks   []*config.Task
	tickers []*schedule.Ticker
	logCtx  context.Context
	stop    chan bool
}

// NewScheduler creates a scheduler and register the schedules from the tasks configs.
func NewScheduler(tasks []*config.Task) *Scheduler {
	ctx := context.Background()
	ctx = servicecontext.WithServiceName(ctx, "scheduler")
	return &Scheduler{
		tasks:  tasks,
		logCtx: ctx,
		stop:   make(chan bool, 1),
	}
}

// Serve implements supervisor service interface.
func (s *Scheduler) Serve() {
	for _, t := range s.tasks {
		if t.LoopInterval != "" {
			// Check t.HasInterval
			if i, e := schedule.NewTickerScheduleFromISO(t.LoopInterval); e == nil {
				log.Logger(s.logCtx).Info("Starting a ticker for task loop - " + t.Label)
				ticker := schedule.NewTicker(i, func() error {
					go GetBus().Pub(MessageSyncLoop, TopicSync_+t.Uuid)
					return nil
				})
				ticker.Start()
				s.tickers = append(s.tickers, ticker)
			} else {
				log.Logger(s.logCtx).Error("Cannot parse interval as duration :" + e.Error())
			}
		}
		if t.HardInterval != "" {
			// Check t.HasInterval
			if i, e := schedule.NewTickerScheduleFromISO(t.HardInterval); e == nil {
				log.Logger(s.logCtx).Info("Starting a ticker for task full resync - " + t.Label)
				ticker := schedule.NewTicker(i, func() error {
					go GetBus().Pub(MessageResync, TopicSync_+t.Uuid)
					return nil
				})
				ticker.Start()
				s.tickers = append(s.tickers, ticker)
			} else {
				log.Logger(s.logCtx).Error("Cannot parse interval as duration :" + e.Error())
			}
		}
	}
	<-s.stop
}

// Stop implements supervisor service interface.
func (s *Scheduler) Stop() {
	log.Logger(s.logCtx).Info("Stopping all tickers")
	for _, t := range s.tickers {
		t.Stop()
	}
	log.Logger(s.logCtx).Info("Stopping scheduler")
	close(s.stop)
}
