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
	"bufio"
	"context"
	"os"

	"github.com/pydio/cells/v4/common/log"
	servicecontext "github.com/pydio/cells/v4/common/service/context"
)

// StdInner is a supervisor service for scanning StdIn
type StdInner struct {
	ctx context.Context
}

// Serve implements supervisor service interface.
func (s *StdInner) Serve() {

	s.ctx = servicecontext.WithServiceName(context.Background(), "scanner")

	log.Logger(s.ctx).Info("Use 'quit' or Ctrl+C to exit, type 'resync', 'dry', 'loop' to control syncs, 'pause' or 'resume'")
	bus := GetBus()
	if os.Stdin != nil {
		scanner := bufio.NewScanner(os.Stdin)
		for scanner.Scan() {
			text := scanner.Text()
			if cmd, e := MessageFromString(text); e == nil {
				if cmd == MessageHalt {
					bus.Pub(cmd, TopicGlobal)
				} else {
					bus.Pub(cmd, TopicSyncAll)
				}
			}
		}
	}

}

// Stop implements supervisor service interface.
func (s *StdInner) Stop() {
	log.Logger(s.ctx).Info("Stopping StdIn Scanner")
}
