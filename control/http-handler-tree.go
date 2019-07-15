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
	"net/url"
	"path"
	"runtime"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang/protobuf/jsonpb"

	"github.com/pydio/cells/common"
	"github.com/pydio/cells/common/log"
	"github.com/pydio/cells/common/proto/tree"
	"github.com/pydio/cells/common/sync/model"
	"github.com/pydio/sync/endpoint"
)

type Request struct {
	EndpointURI      string
	Path             string
	windowsDrive     string
	browseWinVolumes bool
	endpoint         model.Endpoint
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

func applyWindowsTransformation(request *Request) error {
	u, e := url.Parse(request.EndpointURI)
	if e != nil {
		return e
	}

	if u.Path == "" {
		pathLen := len(request.Path)
		if pathLen > 2 {
			prefix := "/" + strings.ToUpper(request.Path[1:3])
			request.windowsDrive = prefix + "/"

			builtPath := ""
			if pathLen > 3 {
				request.Path = strings.Replace(builtPath+request.Path[3:], "\\", "/", -1)
			} else {
				request.Path = "\\"
			}

			request.EndpointURI = request.EndpointURI + prefix
		} else {
			request.Path = "/"
			request.browseWinVolumes = true
		}
	} else {
		request.browseWinVolumes = false
	}

	return nil
}

func parseRequest(c *gin.Context) (*Request, error) {
	var request Request
	dec := json.NewDecoder(c.Request.Body)
	if e := dec.Decode(&request); e != nil {
		return nil, e
	}

	// Special case for browsing windows FS
	if strings.HasPrefix(request.EndpointURI, "fs://") && runtime.GOOS == "windows" {
		err := applyWindowsTransformation(&request)
		if err != nil {
			return &request, err
		}
	}

	ep, e := endpoint.EndpointFromURI(request.EndpointURI, "", true)
	if e != nil {
		return nil, e
	}
	request.endpoint = ep
	return &request, nil
}

func ls(c *gin.Context) {
	ctx := context.Background()
	request, e := parseRequest(c)
	if e != nil {
		log.Logger(ctx).Error("Failed to parse request: " + e.Error())
		writeError(c, e)
		return
	}

	log.Logger(context.Background()).Info("Browsing " + request.endpoint.GetEndpointInfo().URI + " on path " + request.Path)

	response := &Response{}

	if request.browseWinVolumes {
		response.Node = &tree.Node{}
		for _, v := range browseWinVolumes(ctx) {
			response.Children = append(response.Children, v)
		}
	} else if node, err := request.endpoint.LoadNode(ctx, request.Path); err == nil {
		response.Node = node.WithoutReservedMetas()
		if !node.IsLeaf() {
			if source, ok := model.AsPathSyncSource(request.endpoint); ok {
				source.Walk(func(p string, node *tree.Node, err error) {
					if err != nil {
						return
					}
					if request.windowsDrive != "" {
						p = path.Join(request.windowsDrive, p)
						node.Path = p
					}
					// Small fix for router case at level 0
					if strings.HasPrefix(node.Uuid, "DATASOURCE:") {
						node.Type = tree.NodeType_COLLECTION
					}
					if path.Base(p) != common.PYDIO_SYNC_HIDDEN_FILE_META && !strings.HasPrefix(path.Base(p), ".") {
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
