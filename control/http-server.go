package control

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-contrib/static"
	"github.com/gin-gonic/gin"
	"github.com/pborman/uuid"
	"gopkg.in/olahol/melody.v1"

	"github.com/pydio/cells/common/log"
	"github.com/pydio/sync/app/ux"
	"github.com/pydio/sync/config"
)

type Message struct {
	Type    string
	Content interface{}
}

type CmdContent struct {
	UUID string
	Cmd  string
}

type ConfigContent struct {
	Cmd    string
	Config *config.Task
}

func (m *Message) Bytes() []byte {
	d, e := json.Marshal(m)
	if e != nil {
		log.Logger(context.Background()).Info("CANNOT JSON-ENCODE MESSAGE!" + e.Error())
	}
	return d
}

func MessageFromData(d []byte) *Message {
	var m Message
	if e := json.Unmarshal(d, &m); e == nil {
		if m.Type == "CMD" {
			// Convert Content to CmdContent
			d, _ := json.Marshal(m.Content)
			var cmdContent CmdContent
			if e := json.Unmarshal(d, &cmdContent); e == nil {
				m.Content = &cmdContent
			}
		} else if m.Type == "CONFIG" {
			d, _ := json.Marshal(m.Content)
			var configContent ConfigContent
			if e := json.Unmarshal(d, &configContent); e == nil {
				m.Content = &configContent
			}
		}
		return &m
	} else {
		m.Type = "ERROR"
		m.Content = e.Error()
		return &m
	}

}

type HttpServer struct {
	Websocket *melody.Melody
	done      chan bool
}

func (h *HttpServer) InitHandlers() {

	h.Websocket = melody.New()
	h.Websocket.Config.MaxMessageSize = 2048

	h.Websocket.HandleError(func(session *melody.Session, i error) {
		session.Close()
	})

	h.Websocket.HandleClose(func(session *melody.Session, i int, i2 string) error {
		session.Close()
		return nil
	})

	h.Websocket.HandleMessage(func(session *melody.Session, bytes []byte) {

		data := MessageFromData(bytes)
		switch data.Type {
		case "PING":

			m := &Message{Type: "PONG", Content: "Hello new client!"}
			session.Write(m.Bytes())
			GetBus().Pub(MessagePublishState, TopicSyncAll)

		case "CMD":

			if cmd, ok := data.Content.(*CmdContent); ok {
				if intCmd, err := MessageFromString(cmd.Cmd); err == nil {
					log.Logger(context.Background()).Info("Sending Command " + cmd.Cmd)
					if cmd.UUID != "" {
						go GetBus().Pub(intCmd, TopicSync_+cmd.UUID)
					} else {
						go GetBus().Pub(intCmd, TopicSyncAll)
					}
				}
			}

		case "CONFIG":

			if confContent, ok := data.Content.(*ConfigContent); ok {
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

			log.Logger(context.Background()).Error("Cannot read message" + string(bytes))

		}
	})

	go h.ListenStatus()

}

func (h *HttpServer) ListenStatus() {
	statuses := GetBus().Sub(TopicState)
	for {
		select {
		case <-h.done:
			GetBus().Unsub(statuses, TopicState)
			return
		case s := <-statuses:
			m := &Message{
				Type:    "STATE",
				Content: s,
			}
			h.Websocket.Broadcast(m.Bytes())
		}
	}
}

func (h *HttpServer) Serve() {

	h.done = make(chan bool)
	h.InitHandlers()
	gin.SetMode(gin.ReleaseMode)
	gin.DisableConsoleColor()
	Server := gin.New()
	Server.Use(gin.Recovery())
	Server.Use(static.Serve("/", ux.Box))
	Server.GET("/status", func(c *gin.Context) {
		h.Websocket.HandleRequest(c.Writer, c.Request)
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
	log.Logger(context.Background()).Info("Starting HttpServer on port 3636")
	http.ListenAndServe(":3636", Server)

}

func (h *HttpServer) Stop() {
	h.done <- true
}
