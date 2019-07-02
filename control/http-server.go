package control

import (
	"bufio"
	"context"
	"io"
	"net/http"
	"time"

	servicecontext "github.com/pydio/cells/common/service/context"

	"github.com/gin-contrib/cors"
	"github.com/gin-contrib/static"
	"github.com/gin-gonic/gin"
	"github.com/pborman/uuid"
	"gopkg.in/olahol/melody.v1"

	"github.com/pydio/cells/common/log"
	"github.com/pydio/sync/app/ux"
	"github.com/pydio/sync/common"
	"github.com/pydio/sync/config"
)

type HttpServer struct {
	WebSocket     *melody.Melody
	LogSocket     *melody.Melody
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
	go func() {
		scanner := bufio.NewScanner(r)
		for scanner.Scan() {
			line := scanner.Text()
			if h.LogSocket != nil {
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
	return h.logWriter.Write(p)
}

func (h *HttpServer) InitHandlers() {

	h.LogSocket = melody.New()
	h.LogSocket.Config.MaxMessageSize = 2048
	h.LogSocket.HandleError(func(session *melody.Session, i error) {
		//log.Logger(context.Background()).Info("Got Error from LogSocket " + i.Error())
	})
	h.LogSocket.HandleClose(func(session *melody.Session, i int, i2 string) error {
		session.Close()
		return nil
	})
	h.LogSocket.HandleConnect(func(session *melody.Session) {
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
				if confContent.Cmd == "create" {
					confContent.Config.Uuid = uuid.New()
					confs.Create(confContent.Config)
				} else if confContent.Cmd == "edit" {
					confs.Update(confContent.Config)
				} else if confContent.Cmd == "delete" {
					confs.Remove(confContent.Config)
				}
			}

		default:

			log.Logger(h.ctx).Error("Cannot read message" + string(bytes))

		}
	})

	go h.ListenStatus()

}

func (h *HttpServer) drop(s common.SyncState) bool {
	defer func() {
		h.lastSyncState = s
	}()
	if (h.lastSyncState == common.SyncState{}) {
		return false
	}
	if h.lastSyncState.Status == common.SyncStatusProcessing && s.Status == common.SyncStatusProcessing {
		newPg := s.LastProcessStatus.Progress
		oldPg := h.lastSyncState.LastProcessStatus.Progress
		// Limit number of events, except if progress is 100% which may indicate some additional checks/cleaning operations
		if newPg > 0 && newPg < 1 && oldPg > 0 && newPg-oldPg <= 0.001 {
			return true
		}
	}
	return false
}

func (h *HttpServer) ListenStatus() {
	statuses := GetBus().Sub(TopicState)
	for {
		select {
		case <-h.done:
			GetBus().Unsub(statuses, TopicState)
			return
		case s := <-statuses:
			state := s.(common.SyncState)
			if !h.drop(state) {
				m := &common.Message{
					Type:    "STATE",
					Content: s,
				}
				h.WebSocket.Broadcast(m.Bytes())
			}
		}
	}
}

func (h *HttpServer) Serve() {

	h.done = make(chan bool)
	h.InitHandlers()
	log.RegisterWriteSyncer(h)
	gin.SetMode(gin.ReleaseMode)
	gin.DisableConsoleColor()
	Server := gin.New()
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
	Server.POST("/tree", ls)
	Server.PUT("/tree", mkdir)
	Server.GET("/patches/:uuid/:offset/:limit", listPatches)
	log.Logger(h.ctx).Info("Starting HttpServer on port 3636")
	http.ListenAndServe(":3636", Server)

}

func (h *HttpServer) Stop() {
	h.done <- true
}
