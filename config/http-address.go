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
	"fmt"
	"net"
	"sync"
)

var (
	httpAddress string
	noAvail     error
	httpOnce    = &sync.Once{}
)

// GetHttpProtocol returns the protocol to use for binding. Currently only http is supported.
func GetHttpProtocol() string {
	return "http"
}

// GetHttpAddress tries to bind to an available port between 3636 and 3666 and returns the first port available.
// This range of port is important for the OAuth2 authentication mechanism as the associated redirect_uris are
// automatically registered inside the server.
func GetHttpAddress() (string, error) {
	httpOnce.Do(func() {
		// Todo : allowing outbound connection could be set up in configs - leave host empty in that case
		hostname := "localhost"
		port := 3636
		for ; port <= 3666; port++ {
			l, err := net.Listen("tcp", fmt.Sprintf("%s:%d", hostname, port))
			if err == nil {
				l.Close()
				break
			}
		}
		if port > 3666 {
			noAvail = fmt.Errorf("cannot get any available port between 3636 and 3666, this will be a problem for oidc callback registered in server")
		} else {
			httpAddress = fmt.Sprintf("%s:%d", hostname, port)
		}
	})
	return httpAddress, noAvail
}
