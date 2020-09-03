// +build !windows

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

package cmd

import (
	"os"
	"os/signal"
	"runtime/pprof"
	"syscall"

	"github.com/pydio/cells-sync/control"
)

func handleSignals() {
	c := make(chan os.Signal, 1)
	signal.Notify(c, syscall.SIGINT, syscall.SIGHUP, syscall.SIGUSR1)

	go func() {

		for sig := range c {
			switch sig {
			case syscall.SIGINT:

				control.GetBus().Pub(control.MessageHalt, control.TopicGlobal)

			case syscall.SIGHUP:
				// Restart all sync
				control.GetBus().Pub(control.MessageRestart, control.TopicGlobal)

			case syscall.SIGUSR1:

				pprof.Lookup("goroutine").WriteTo(os.Stdout, 1)

			}
		}
	}()
}
