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

package config

import (
	"sync"
	"time"

	"github.com/pydio/cells/common/log"
)

var monitors map[string]*tokenMonitor

var monitorsLock *sync.Mutex

// tokenMonitor automatically refresh IdToken as needed
type tokenMonitor struct {
	a       *Authority
	trigger chan struct{}
	done    chan bool
}

func getTokenMonitor(a *Authority) *tokenMonitor {
	monitorsLock.Lock()
	defer func() {
		monitorsLock.Unlock()
	}()
	if m, ok := monitors[a.key()]; ok {
		return m
	} else {
		monitor := &tokenMonitor{
			a:       a,
			trigger: make(chan struct{}, 1),
			done:    make(chan bool, 1),
		}
		monitors[a.key()] = monitor
		go monitor.Start()
		return monitor
	}
}

func (t *tokenMonitor) Start() {
	var nextTick time.Duration
	nextTick, _ = t.a.RefreshRequired()
	safeInterval := time.NewTicker(2 * time.Minute)
	defer func() {
		safeInterval.Stop()
		close(t.trigger)
	}()
	for {
		select {
		case <-safeInterval.C:
			var now bool
			log.Logger(oidcContext).Info("Additional safe check for token " + t.a.key())
			nextTick, now = t.a.RefreshRequired()
			if now {
				t.trigger <- struct{}{}
			}
		case <-time.After(nextTick):
			t.trigger <- struct{}{}
		case <-t.trigger:
			if e := t.a.Refresh(); e != nil {
				log.Logger(oidcContext).Info("Refreshing token failed for " + t.a.key() + ", will retry in 10s")
				nextTick = 10 * time.Second
			} else {
				nextTick, _ = t.a.RefreshRequired()
			}
		case <-t.done:
			log.Logger(oidcContext).Info("Stopping token monitoring for " + t.a.key())
			return
		}
	}
}

func (t *tokenMonitor) Stop() {
	close(t.done)
}

func stopMonitoringToken(key string) {
	monitorsLock.Lock()
	if monitor, ok := monitors[key]; ok {
		monitor.Stop()
		delete(monitors, key)
	}
	monitorsLock.Unlock()
}
