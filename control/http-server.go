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
	"io"
	"net/http"
	"time"

	"github.com/pydio/cells/common/sync/model"

	servicecontext "github.com/pydio/cells/common/service/context"

	"github.com/gin-contrib/cors"
	"github.com/gin-contrib/static"
	"github.com/gin-gonic/gin"
	"github.com/pborman/uuid"
	"gopkg.in/olahol/melody.v1"

	"github.com/pydio/cells-sync/app/ux"
	"github.com/pydio/cells-sync/common"
	"github.com/pydio/cells-sync/config"
	"github.com/pydio/cells/common/log"
)

type HttpServer struct {
	WebSocket          *melody.Melody
	LogSocket          *melody.Melody
	logSocketConnected bool

	done          chan bool
	recentLogs    [][]byte
	lastSyncState common.SyncState
	ctx           context.Context

	logWriter *io.PipeWriter
}

func NewHttpServer() *HttpServer {
	httpServerCtx := servicecontext.WithServiceName(context.Background(), "http-server")
	httpServerCtx = servicecontext.WithServiceColor(httpServerCtx, servicecontext.ServiceColorRest)
	r, w := io.Pipe()
	h := &HttpServer{
		ctx:       httpServerCtx,
		logWriter: w,
	}
	log.RegisterWriteSyncer(h)
	go func() {
		scanner := bufio.NewScanner(r)
		for scanner.Scan() {
			line := scanner.Text()
			if h.LogSocket != nil && h.logSocketConnected {
				h.LogSocket.Broadcast([]byte(line))
			}
			// Keep last 200 lines in memory
			if len(h.recentLogs) < 200 {
				h.recentLogs = append(h.recentLogs, []byte(line))
			} else {
				h.recentLogs = append(h.recentLogs[1:], []byte(line))
			}
		}
	}()
	return h
}

func (h *HttpServer) Sync() error {
	return nil
}

func (h *HttpServer) Write(p []byte) (n int, err error) {
	go h.logWriter.Write(p)
	return len(p), nil
}

func (h *HttpServer) InitHandlers() {

	h.LogSocket = melody.New()
	h.LogSocket.Config.MaxMessageSize = 2048
	h.LogSocket.HandleError(func(session *melody.Session, i error) {
		//log.Logger(context.Background()).Info("Got Error from LogSocket " + i.Error())
	})
	h.LogSocket.HandleClose(func(session *melody.Session, i int, i2 string) error {
		h.logSocketConnected = false
		session.Close()
		return nil
	})
	h.LogSocket.HandleConnect(func(session *melody.Session) {
		h.logSocketConnected = true
		for _, p := range h.recentLogs {
			session.Write(p)
		}
	})

	h.WebSocket = melody.New()
	h.WebSocket.Config.MaxMessageSize = 2048

	h.WebSocket.HandleError(func(session *melody.Session, i error) {
		//log.Logger(context.Background()).Info("Got Error from WebSocket " + i.Error())
	})

	h.WebSocket.HandleClose(func(session *melody.Session, i int, i2 string) error {
		session.Close()
		return nil
	})

	h.WebSocket.HandleMessage(func(session *melody.Session, bytes []byte) {

		data := common.MessageFromData(bytes)
		switch data.Type {
		case "PING":

			m := &common.Message{Type: "PONG", Content: "Hello new client!"}
			session.Write(m.Bytes())
			GetBus().Pub(MessagePublishState, TopicSyncAll)

		case "CMD":

			if cmd, ok := data.Content.(*common.CmdContent); ok {
				if intCmd, err := MessageFromString(cmd.Cmd); err == nil {
					if cmd.UUID != "" {
						go GetBus().Pub(intCmd, TopicSync_+cmd.UUID)
					} else {
						go GetBus().Pub(intCmd, TopicSyncAll)
					}
				}
			}

		case "CONFIG":

			if confContent, ok := data.Content.(*common.ConfigContent); ok {
				confs := config.Default()
				if confContent.Task != nil {
					if confContent.Cmd == "create" {
						confContent.Task.Uuid = uuid.New()
						confs.CreateTask(confContent.Task)
					} else if confContent.Cmd == "edit" {
						confs.UpdateTask(confContent.Task)
					} else if confContent.Cmd == "delete" {
						confs.RemoveTask(confContent.Task)
					}
				} else if confContent.Authority != nil {
					if confContent.Cmd == "create" {
						confs.CreateAuthority(confContent.Authority)
					} else if confContent.Cmd == "edit" {
						confs.UpdateAuthority(confContent.Authority, false)
					} else if confContent.Cmd == "delete" {
						confs.RemoveAuthority(confContent.Authority)
					} else if confContent.Cmd == "list" {
						message := &common.Message{Type: "AUTHORITIES", Content: confs.PublicAuthorities()}
						session.Write(message.Bytes())
					}

				}
			}

		case "UPDATE":

			if req, ok := data.Content.(*common.UpdateCheckRequest); ok {
				if req.Check {
					go GetBus().Pub(req, TopicUpdate)
				} else if req.Version {
					// Just publish version back to client
					message := &common.Message{Type: "UPDATE", Content: &common.UpdateVersion{
						PackageName: common.PackageType,
						Version:     common.Version,
						Revision:    common.BuildRevision,
						BuildStamp:  common.BuildStamp,
					}}
					session.Write(message.Bytes())
				}
			} else if req, ok := data.Content.(*common.UpdateApplyRequest); ok {
				go GetBus().Pub(req, TopicUpdate)
			}

		default:

			log.Logger(h.ctx).Error("Cannot read message " + string(bytes))

		}
	})

	go h.ListenStatus()
	go h.ListenAuthorities()

}

func (h *HttpServer) drop(s common.SyncState) bool {
	defer func() {
		h.lastSyncState = s
	}()
	if (h.lastSyncState == common.SyncState{}) {
		return false
	}
	if h.lastSyncState.Status == model.TaskStatusProcessing && s.Status == model.TaskStatusProcessing && s.LastProcessStatus != nil {
		newPg := s.LastProcessStatus.Progress()
		oldPg := float32(0)
		if h.lastSyncState.LastProcessStatus != nil {
			oldPg = h.lastSyncState.LastProcessStatus.Progress()
		}
		// Limit number of events, except if progress is 100% which may indicate some additional checks/cleaning operations
		if newPg > 0 && newPg < 1 && oldPg > 0 && newPg-oldPg <= 0.001 {
			return true
		}
	}
	return false
}

func (h *HttpServer) ListenStatus() {
	statuses := GetBus().Sub(TopicState, TopicUpdate)
	for {
		select {
		case <-h.done:
			GetBus().Unsub(statuses, TopicState, TopicUpdate)
			return
		case s := <-statuses:
			if state, ok := s.(common.SyncState); ok {
				if !h.drop(state) {
					m := &common.Message{
						Type:    "STATE",
						Content: s,
					}
					h.WebSocket.Broadcast(m.Bytes())
				}
			} else if update, ok := s.(common.UpdateMessage); ok {
				m := &common.Message{
					Type:    "UPDATE",
					Content: update,
				}
				h.WebSocket.Broadcast(m.Bytes())
			}
		}
	}
}

func (h *HttpServer) ListenAuthorities() {
	watches := config.Watch()
	for w := range watches {
		if _, ok := w.(*config.AuthChange); ok {
			// Broadcast servers list to all clients
			message := &common.Message{Type: "AUTHORITIES", Content: config.Default().PublicAuthorities()}
			h.WebSocket.Broadcast(message.Bytes())
		}
	}
}

func (h *HttpServer) Serve() {

	h.done = make(chan bool)
	h.InitHandlers()
	gin.SetMode(gin.ReleaseMode)
	gin.DisableConsoleColor()
	Server := gin.New()
	Server.NoRoute(func(i *gin.Context) {
		ux.Box.Bytes("index.html")
		i.Data(http.StatusOK, "text/html; charset=utf-8", ux.Box.Bytes("index.html"))
	})
	Server.Use(gin.Recovery())
	Server.Use(static.Serve("/", ux.Box))
	Server.GET("/status", func(c *gin.Context) {
		h.WebSocket.HandleRequest(c.Writer, c.Request)
	})
	Server.GET("/logs", func(c *gin.Context) {
		h.LogSocket.HandleRequest(c.Writer, c.Request)
	})
	// Simple RestAPI for browsing/creating nodes inside Endpoints
	Server.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"PUT", "POST"},
		AllowHeaders:     []string{"*"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))
	// Manage Tree
	Server.POST("/tree", h.ls)
	Server.PUT("/tree", h.mkdir)

	// Load Patch contents
	Server.GET("/patches/:uuid/:offset/:limit", h.listPatches)

	// Manage global config
	Server.GET("/config", h.loadConf)
	Server.PUT("/config", h.updateConf)

	log.Logger(h.ctx).Info("Starting HttpServer on port 3636")
	if e := http.ListenAndServe(":3636", Server); e != nil {
		log.Logger(h.ctx).Error("Cannot start server: " + e.Error())
	}
}

func (h *HttpServer) Stop() {
	h.done <- true
}
