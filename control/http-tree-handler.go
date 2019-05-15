/*
 * Copyright (c) 2019. Abstrium SAS <team (at) pydio.com>
 * This file is part of Pydio Cells.
 *
 * Pydio Cells is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Pydio Cells is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Pydio Cells.  If not, see <http://www.gnu.org/licenses/>.
 *
 * The latest code can be found at <https://pydio.com>.
 */

package control

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"path"

	"github.com/pydio/cells/common/log"

	"github.com/pydio/cells/common"

	"github.com/pydio/cells/common/sync/model"

	"github.com/pydio/sync/endpoint"

	"github.com/gin-gonic/gin"
	"github.com/golang/protobuf/jsonpb"

	"github.com/pydio/cells/common/proto/tree"
)

type Request struct {
	EndpointURI string
	Path        string
	endpoint    model.Endpoint
}

type Response struct {
	Node     *tree.Node
	Children []*tree.Node
}

func (l *Response) ProtoMessage() {}
func (l *Response) Reset()        {}
func (l *Response) String() string {
	return ""
}

func (l *Response) MarshalJSON() ([]byte, error) {
	encoder := jsonpb.Marshaler{}
	buffer := bytes.NewBuffer(nil)
	e := encoder.Marshal(buffer, l)
	return buffer.Bytes(), e
}

func writeError(i *gin.Context, e error) {
	i.JSON(http.StatusInternalServerError, map[string]string{"error": e.Error()})
}

func parseRequest(c *gin.Context) (*Request, error) {
	var request Request
	dec := json.NewDecoder(c.Request.Body)
	if e := dec.Decode(&request); e != nil {
		return nil, e
	}
	ep, e := endpoint.EndpointFromURI(request.EndpointURI, "")
	if e != nil {
		return nil, e
	}
	request.endpoint = ep
	return &request, nil
}

func ls(c *gin.Context) {
	request, e := parseRequest(c)
	if e != nil {
		writeError(c, e)
		return
	}
	log.Logger(context.Background()).Info("Browsing " + request.endpoint.GetEndpointInfo().URI + " on path " + request.Path)
	response := &Response{}
	if node, err := request.endpoint.LoadNode(context.Background(), request.Path); err == nil {
		response.Node = node.WithoutReservedMetas()
		if !node.IsLeaf() {
			if source, ok := model.AsPathSyncSource(request.endpoint); ok {
				source.Walk(func(p string, node *tree.Node, err error) {
					if err == nil && path.Base(p) != common.PYDIO_SYNC_HIDDEN_FILE_META {
						response.Children = append(response.Children, node.WithoutReservedMetas())
					}
				}, request.Path, false)
			}
		}
	} else {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, response)

}

func mkdir(c *gin.Context) {
	request, e := parseRequest(c)
	if e != nil {
		writeError(c, e)
		return
	}
	target, ok := model.AsPathSyncTarget(request.endpoint)
	if !ok {
		writeError(c, fmt.Errorf("cannot.write"))
		return
	}
	newNode := &tree.Node{
		Path: request.Path,
		Type: tree.NodeType_COLLECTION,
	}
	if e := target.CreateNode(context.Background(), newNode, false); e != nil {
		writeError(c, e)
		return
	}

	log.Logger(context.Background()).Info("Created folder on " + request.endpoint.GetEndpointInfo().URI + " at path " + request.Path)
	c.JSON(http.StatusOK, &Response{Node: newNode})
}
