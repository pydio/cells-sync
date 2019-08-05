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
	"fmt"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/pydio/cells/common/sync/merger"
	"github.com/pydio/cells-sync/endpoint"
)

type PatchesRequest struct {
	SyncUUID string `uri:"uuid" binding:"required"`
	Offset   int    `uri:"offset" binding:"numeric"`
	Limit    int    `uri:"limit"`
}

type PatchesResponse struct {
	Patches []merger.Patch
}

func (h *HttpServer) parsePatchRequest(c *gin.Context) (*PatchesRequest, error) {
	pR := &PatchesRequest{
		SyncUUID: c.Param("uuid"),
		Limit:    10,
	}
	if pR.SyncUUID == "" {
		return nil, fmt.Errorf("please provide a sync UUID")
	}
	if o, e := strconv.ParseInt(c.Param("offset"), 10, 64); e == nil {
		pR.Offset = int(o)
	}
	if l, e := strconv.ParseInt(c.Param("limit"), 10, 64); e == nil {
		pR.Limit = int(l)
	}
	return pR, nil
}

// reqRespStore uses a Pub/Sub model to synchronously retrieve a pointer to the PatchStore of a sync.
func (h *HttpServer) reqRespStore(syncUUID string) *endpoint.PatchStore {

	var store *endpoint.PatchStore
	wg := sync.WaitGroup{}
	wg.Add(1)
	ch := GetBus().Sub(TopicStore_ + syncUUID)
	go func() {
		defer func() {
			wg.Done()
			GetBus().Unsub(ch)
		}()
		for {
			select {
			case s := <-ch:
				store = s.(*endpoint.PatchStore)
				return
			case <-time.After(100 * time.Millisecond):
				return
			}
		}
	}()
	GetBus().Pub(MessagePublishStore, TopicSync_+syncUUID)
	wg.Wait()

	return store
}

// listPatches loads patches from store
func (h *HttpServer) listPatches(c *gin.Context) {
	request, e := h.parsePatchRequest(c)
	if e != nil {
		h.writeError(c, e)
		return
	}
	store := h.reqRespStore(request.SyncUUID)
	if store == nil {
		h.writeError(c, fmt.Errorf("cannot load store"))
		return
	}
	patches, err := store.Load(request.Offset, request.Limit)
	if err != nil {
		h.writeError(c, err)
		return
	}

	data := make(map[string]merger.Patch)
	for _, p := range patches {
		data[fmt.Sprintf("%d", p.GetStamp().Unix())] = p
	}
	c.JSON(http.StatusOK, data)

}
