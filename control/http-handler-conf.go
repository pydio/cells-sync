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
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/pydio/sync/config"
)

func (h *HttpServer) loadConf(i *gin.Context) {
	conf := config.Default()
	i.JSON(http.StatusOK, conf)
}

func (h *HttpServer) updateConf(i *gin.Context) {
	var glob *config.Global
	dec := json.NewDecoder(i.Request.Body)
	if e := dec.Decode(&glob); e != nil {
		h.writeError(i, e)
		return
	}

	if er := config.Default().UpdateGlobals(glob.Logs, glob.Updates); er != nil {
		h.writeError(i, er)
	} else {
		i.JSON(http.StatusOK, config.Default())
	}

}
