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

package endpoint

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"os/user"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/pydio/cells-sync/common"
	"github.com/pydio/cells-sync/config"

	"github.com/pydio/cells/v4/common/sync/endpoints/cells"
	"github.com/pydio/cells/v4/common/sync/endpoints/filesystem"
	"github.com/pydio/cells/v4/common/sync/endpoints/memory"
	"github.com/pydio/cells/v4/common/sync/endpoints/s3"
	"github.com/pydio/cells/v4/common/sync/model"
)

// EndpointFromURI parse an URI string to instantiate a proper Endpoint
func EndpointFromURI(uri string, otherUri string, browseOnly ...bool) (ep model.Endpoint, e error) {

	u, e := url.Parse(uri)
	if e != nil {
		return nil, e
	}
	opts := model.EndpointOptions{}
	if len(browseOnly) > 0 && browseOnly[0] {
		opts.BrowseOnly = true
	}

	switch u.Scheme {

	case "fs":
		path := string(u.Path)
		if runtime.GOOS == `windows` && path != "" && opts.BrowseOnly {
			//E://sync/left
			path = path[1:2] + ":\\"
			if len(u.Path) > 3 {
				path = filepath.Join(path, u.Path[3:])
			}
		}
		return filesystem.NewFSClient(path, opts)

	case "db":
		return memory.NewMemDB(), nil

		/*
			case "router":
				otherU, _ := url.Parse(otherUri)
				options := cells.Options{
					EndpointOptions:   opts,
					LocalInitRegistry: true,
				}
				if otherU != nil && otherU.Scheme == "router" {
					options.RenewFolderUuids = true
				}
				return local.NewLocal(strings.TrimLeft(u.Path, "/"), options), nil
		*/

	case "http", "https":

		var auth *config.Authority
		for _, a := range config.Default().Authorities {
			newU := *u
			newU.Path = ""
			if a.Id == newU.String() {
				auth = a
				break
			}
		}
		if auth == nil {
			return nil, fmt.Errorf("cannot find authority")
		}
		// Warning, we use the ACCESSS TOKEN as IdToken
		conf := cells.RemoteConfig{
			Url:           fmt.Sprintf("%s://%s", u.Scheme, u.Host),
			IdToken:       auth.AccessToken,
			RefreshToken:  auth.RefreshToken,
			ExpiresAt:     auth.ExpiresAt,
			SkipVerify:    auth.InsecureSkipVerify,
			CustomHeaders: map[string]string{"User-Agent": "cells-sync/" + common.Version},
		}
		options := cells.Options{
			EndpointOptions: opts,
		}
		ep := cells.NewRemote(conf, strings.TrimLeft(u.Path, "/"), options)
		if !opts.BrowseOnly {
			watcher := config.Watch()
			go func() {
				for change := range watcher {
					if aC, ok := change.(*config.AuthChange); ok {
						acUrl, _ := url.Parse(aC.Authority.URI)
						if acUrl.Scheme == u.Scheme && acUrl.Host == u.Host && aC.Authority.Username == u.User.Username() {
							if aC.Type == "delete" {
								return
							} else {
								conf.IdToken = aC.Authority.AccessToken
								conf.RefreshToken = aC.Authority.RefreshToken
								conf.ExpiresAt = aC.Authority.ExpiresAt
								ep.RefreshRemoteConfig(conf)
							}
						}
					}
				}
			}()
		}
		return ep, nil

	case "s3":
		fullPath := u.Path
		parts := strings.Split(fullPath, "/")
		bucket := parts[1]
		parts = parts[2:]
		rootPath := strings.Join(parts, "/")
		if u.User == nil {
			return nil, errors.New("please provide API keys and secret in URL")
		}
		password, _ := u.User.Password()
		values := u.Query()
		normalize := values.Get("normalize") == "true"
		secure := strings.Contains(u.Hostname(), "amazonaws.com") || values.Get("secure") == "true"
		client, e := s3.NewClient(context.Background(), u.Host, u.User.Username(), password, bucket, rootPath, secure, opts)
		if e != nil {
			return nil, e
		}
		if normalize {
			client.ServerRequiresNormalization = true
		}
		return client, nil

	default:
		return nil, fmt.Errorf("unsupported scheme " + u.Scheme)
	}

}

// DefaultDirForURI tries to find a default directory to display to user when they choose a specific endpoint.
// Currently only used for FS, returning ${HOMEDIR}/Cells
func DefaultDirForURI(uri string) string {
	p, e := url.Parse(uri)
	if e != nil {
		return ""
	}
	if p.Scheme != "fs" {
		return ""
	}
	if u, e := user.Current(); e == nil {
		parts := strings.Split(u.HomeDir, string(filepath.Separator))
		parts = append(parts, "Cells")
		return strings.Join(parts, "/")
	}
	return ""
}
