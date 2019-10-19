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
	"strings"

	"github.com/zalando/go-keyring"

	"github.com/pydio/cells/common/log"
)

var (
	keyringService = "com.pydio.CellsSync"
	tokenSeparator = "__//__"
)

// AuthToKeyring tries to store tokens in local keychain and remove them from the conf
func AuthToKeyring(a Authority) (Authority, error) {
	if a.AccessToken != "" && a.RefreshToken != "" {
		key := a.Id + "::AccessToken"
		value := strings.Join([]string{a.AccessToken, a.IdToken, a.RefreshToken}, tokenSeparator)
		if e := keyring.Set(keyringService, key, value); e != nil {
			return a, e
		}
		log.Logger(oidcContext).Debug("Saved token in keyring for authority " + a.Id)
		a.AccessToken = ""
		a.IdToken = ""
		a.RefreshToken = ""
	}
	return a, nil
}

// AuthFromKeyring tries to find tokens inside local keychain and feed the conf with them
func AuthFromKeyring(a Authority) (Authority, error) {
	// If nothing is provided, consider it is stored in keyring
	if a.AccessToken == "" && a.RefreshToken == "" {
		if value, e := keyring.Get(keyringService, a.Id+"::AccessToken"); e == nil {
			parts := strings.Split(value, tokenSeparator)
			if len(parts) != 3 {
				return a, fmt.Errorf("wrong format stored in keyring")
			}
			a.AccessToken = parts[0]
			a.IdToken = parts[1]
			a.RefreshToken = parts[2]
			log.Logger(oidcContext).Debug("Loaded token from keyring for authority " + a.Id)
		} else {
			return a, e
		}
	}
	return a, nil
}

// ClearKeyring removes tokens from local keychain, if they are present
func ClearKeyring(a *Authority) error {
	// Try to delete creds from keyring
	err := keyring.Delete(keyringService, a.Id+"::AccessToken")
	if err == nil {
		log.Logger(oidcContext).Info("Removed tokens from keyring")
	}
	return err
}
