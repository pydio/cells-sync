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
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"path"
	"runtime"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/pkg/errors"

	"github.com/pydio/cells-sync/endpoint"
	"github.com/pydio/cells/v4/common"
	"github.com/pydio/cells/v4/common/log"
	"github.com/pydio/cells/v4/common/proto/tree"
	"github.com/pydio/cells/v4/common/sync/model"
)

type TreeRequest struct {
	EndpointURI      string
	Path             string
	windowsDrive     string
	browseWinVolumes bool
	endpoint         model.Endpoint
}

// TreeResponse is a fake protobuf used for marshaling responses to tree requests.
type TreeResponse struct {
	Node     *tree.Node
	Children []*tree.Node
}

// MarshalJSON manually marshal protobuf to JSON
func (l *TreeResponse) MarshalJSON() ([]byte, error) {
	data := make(map[string]interface{})
	if l.Node != nil {
		data["Node"] = l.marshalNode(l.Node)
	}
	var encC []map[string]interface{}
	for _, c := range l.Children {
		encC = append(encC, l.marshalNode(c))
	}
	if len(encC) > 0 {
		data["Children"] = encC
	}
	return json.Marshal(data)
}

func (l *TreeResponse) marshalNode(n *tree.Node) map[string]interface{} {
	d := make(map[string]interface{})
	d["Path"] = n.Path
	d["Size"] = n.Size
	d["Uuid"] = n.Uuid
	d["MTime"] = n.MTime
	d["Etag"] = n.Etag
	d["MetaStore"] = n.MetaStore
	d["Type"] = "LEAF"
	if !n.IsLeaf() {
		d["Type"] = "COLLECTION"
	}
	return d
}

func (h *HttpServer) writeError(i *gin.Context, e error) {
	log.Logger(h.ctx).Error("Request error :" + e.Error())
	data := map[string]string{
		"error": e.Error(),
	}
	if c := errors.Cause(e); c != e {
		data["stack"] = fmt.Sprintf("%+v\n", e)
	}
	i.JSON(http.StatusInternalServerError, data)
}

func (h *HttpServer) applyWindowsTransformation(request *TreeRequest) error {
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

func (h *HttpServer) parseTreeRequest(c *gin.Context) (*TreeRequest, error) {
	var request TreeRequest
	dec := json.NewDecoder(c.Request.Body)
	if e := dec.Decode(&request); e != nil {
		return nil, e
	}

	// Special case for browsing windows FS
	if strings.HasPrefix(request.EndpointURI, "fs://") && runtime.GOOS == "windows" {
		err := h.applyWindowsTransformation(&request)
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

func (h *HttpServer) ls(c *gin.Context) {
	request, e := h.parseTreeRequest(c)
	if e != nil {
		h.writeError(c, e)
		return
	}

	log.Logger(h.ctx).Info("Browsing " + request.endpoint.GetEndpointInfo().URI + " on path " + request.Path)

	response := &TreeResponse{}

	if request.browseWinVolumes {
		response.Node = &tree.Node{}
		for _, v := range browseWinVolumes(h.ctx) {
			response.Children = append(response.Children, v)
		}
	} else if node, err := request.endpoint.LoadNode(h.ctx, request.Path); err == nil {
		response.Node = node.AsProto().WithoutReservedMetas()
		if !node.IsLeaf() {
			if source, ok := model.AsPathSyncSource(request.endpoint); ok {
				er := source.Walk(h.ctx, func(p string, node tree.N, err error) error {
					if err != nil {
						log.Logger(h.ctx).Warn("Ignoring error " + err.Error() + " on path " + p)
						return nil
					}
					if request.windowsDrive != "" {
						p = path.Join(request.windowsDrive, p)
						node.UpdatePath(p)
					}
					// Small fix for router case at level 0
					if strings.HasPrefix(node.GetUuid(), "DATASOURCE:") {
						node.SetType(tree.NodeType_COLLECTION)
					}
					if path.Base(p) != common.PydioSyncHiddenFile && !strings.HasPrefix(path.Base(p), ".") {
						response.Children = append(response.Children, node.AsProto().WithoutReservedMetas())
					}
					return nil
				}, request.Path, false)
				if er != nil {
					h.writeError(c, er)
					return
				}
			}
		}
	} else {
		h.writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, response)
}

func (h *HttpServer) mkdir(c *gin.Context) {
	request, e := h.parseTreeRequest(c)
	if e != nil {
		h.writeError(c, e)
		return
	}
	target, ok := model.AsPathSyncTarget(request.endpoint)
	if !ok {
		h.writeError(c, fmt.Errorf("cannot.write"))
		return
	}
	newNode := &tree.Node{
		Path: request.Path,
		Type: tree.NodeType_COLLECTION,
	}
	if e := target.CreateNode(context.Background(), newNode, false); e != nil {
		h.writeError(c, e)
		return
	}
	// Special case for cells : block until folder is correctly indexed
	if strings.HasPrefix(target.GetEndpointInfo().URI, "http") {
		model.Retry(func() error {
			_, e := target.LoadNode(context.Background(), newNode.Path)
			return e
		}, 2*time.Second, 10*time.Second)
	}

	log.Logger(context.Background()).Info("Created folder on " + request.endpoint.GetEndpointInfo().URI + " at path " + request.Path)
	c.JSON(http.StatusOK, &TreeResponse{Node: newNode})
}

func (h *HttpServer) defaultDir(c *gin.Context) {
	request, e := h.parseTreeRequest(c)
	if e != nil {
		h.writeError(c, e)
		return
	}
	outputDir := endpoint.DefaultDirForURI(request.EndpointURI)
	epDir := outputDir
	if outputDir == "" {
		c.JSON(http.StatusOK, &TreeResponse{Node: &tree.Node{Path: ""}})
		return
	}
	if runtime.GOOS == "windows" {
		outputDir = "/" + outputDir
		request.Path = outputDir
		if er := h.applyWindowsTransformation(request); er != nil {
			c.JSON(http.StatusOK, &TreeResponse{Node: &tree.Node{Path: ""}})
			return
		}
		epDir = request.Path
	}
	if node, err := request.endpoint.LoadNode(context.Background(), epDir); err == nil {
		node.UpdatePath(outputDir)
		c.JSON(http.StatusOK, &TreeResponse{Node: node.AsProto()})
		return
	}

	target, ok := model.AsPathSyncTarget(request.endpoint)
	if !ok {
		h.writeError(c, fmt.Errorf("cannot.write"))
		return
	}
	if e := target.CreateNode(context.Background(), &tree.Node{Path: epDir, Type: tree.NodeType_COLLECTION}, false); e != nil {
		h.writeError(c, e)
		return
	}
	c.JSON(http.StatusOK, &TreeResponse{Node: &tree.Node{Path: outputDir, Type: tree.NodeType_COLLECTION}})
}
