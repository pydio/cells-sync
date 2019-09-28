package tray

import (
	"fmt"
	"net/url"
	"sort"
	"sync"
	"time"

	"github.com/pydio/cells/common/sync/model"

	"github.com/getlantern/systray"
	"github.com/gorilla/websocket"

	"github.com/pydio/cells-sync/common"
	"github.com/pydio/cells/common/log"
	"github.com/pydio/cells/common/service"
)

type StatusMessage int

const (
	StatusConnected StatusMessage = iota
	StatusDisconnected
)

type Client struct {
	sync.Mutex
	conn    *websocket.Conn
	Status  chan StatusMessage
	Errors  chan error
	Tasks   chan []*common.ConcreteSyncState
	done    chan bool
	closing bool
	tasks   map[string]*common.ConcreteSyncState
}

func NewClient() *Client {
	c := &Client{
		Status: make(chan StatusMessage, 10),
		Errors: make(chan error, 10),
		Tasks:  make(chan []*common.ConcreteSyncState, 1),
		done:   make(chan bool),
		tasks:  make(map[string]*common.ConcreteSyncState),
	}
	return c
}

func (c *Client) Reconnect() {
	if err := ws.Connect(); err == nil {
		return
	}
	ticker := time.NewTicker(1 * time.Minute)
	go func() {
		for {
			select {
			case <-ticker.C:
				log.Logger(trayCtx).Info("Trying to reconnect...")
				c.Connect()
			case s := <-c.Status:
				if s == StatusConnected {
					return
				}
			}
		}
	}()
}

func (c *Client) Connect() error {
	parsed, _ := url.Parse(uxUrl)
	if parsed.Scheme == "https" {
		parsed.Scheme = "wss"
	} else {
		parsed.Scheme = "ws"
	}
	parsed.Path = "/status"
	return service.Retry(func() error {
		conn, _, err := websocket.DefaultDialer.Dial(parsed.String(), nil)
		if err == nil {
			go c.bindConn(conn)
			c.Status <- StatusConnected
			log.Logger(trayCtx).Info("Opened WS Connection")
		} else {
			log.Logger(trayCtx).Info("Error while opening WS Connection " + err.Error())
		}
		return err
	}, 6*time.Second, 30*time.Second)
}

func (c *Client) Close() {
	c.closing = true
	if c.conn != nil {
		log.Logger(trayCtx).Info("Closing WS Connection...")
		c.conn.Close()
	}
}

func (c *Client) SendOrderedTasks() {
	var tasks []*common.ConcreteSyncState
	c.Lock()
	for _, t := range c.tasks {
		tasks = append(tasks, t)
	}
	c.Unlock()
	sort.Slice(tasks, func(i, j int) bool {
		t1 := tasks[i]
		t2 := tasks[j]
		return t1.Config.Label < t2.Config.Label
	})
	c.Tasks <- tasks
}

func (c *Client) bindConn(conn *websocket.Conn) {
	c.conn = conn
	go func() {
		defer func() {
			log.Logger(trayCtx).Info("Closing bindConn listener")
		}()
		for {
			messageType, message, err := conn.ReadMessage()
			if c.closing {
				return
			}
			if err != nil {
				log.Logger(trayCtx).Info("Got Error: " + err.Error())
				c.Status <- StatusDisconnected
				go c.Reconnect()
				return
			}
			if messageType == websocket.TextMessage {
				m := common.MessageFromData(message)
				switch m.Type {
				case "STATE":
					content, ok := m.Content.(*common.ConcreteSyncState)
					if ok {
						log.Logger(trayCtx).Debug(fmt.Sprintf("Got state for sync %s - Status %d", content.Config.Label, content.Status))
						c.Lock()
						prev, hasPrev := c.tasks[content.Config.Uuid]
						if content.Status == model.TaskStatusRemoved && hasPrev {
							delete(c.tasks, content.Config.Uuid)
						} else {
							c.tasks[content.Config.Uuid] = content
						}
						c.Unlock()
						if !hasPrev || prev.Status != content.Status {
							c.SendOrderedTasks()
						}
					}
				case "PONG":
					c.Lock()
					c.tasks = make(map[string]*common.ConcreteSyncState)
					c.Unlock()
				case "ERROR":
					log.Logger(trayCtx).Error("Could not parse message")
				}
			}
		}
	}()
	conn.WriteJSON(&common.Message{Type: "PING"})
}

func (c *Client) SendCmd(content *common.CmdContent) {
	if c.conn != nil {
		if e := c.conn.WriteJSON(&common.Message{Type: "CMD", Content: content}); e == nil {
			return
		}
	}
	log.Logger(trayCtx).Error("No active connection for sending message")
}

func (c *Client) SendRoute(route string) {
	if c.conn != nil {
		if e := c.conn.WriteJSON(&common.Message{Type: "WEBVIEW_ROUTE", Content: route}); e == nil {
			return
		}
	}
	log.Logger(trayCtx).Error("No active connection for sending message")
}

func (c *Client) SendHalt() {
	if viewCancel != nil {
		viewCancel()
		viewCancel = nil
	}
	if c.conn != nil {
		log.Logger(trayCtx).Info("Sending 'quit' message to websocket")
		if e := c.conn.WriteJSON(&common.Message{Type: "CMD", Content: &common.CmdContent{Cmd: "quit"}}); e == nil {
			go func() {
				<-time.After(3 * time.Second)
				log.Logger(trayCtx).Error("Process should have been closed by parent, quitting now")
				beforeExit()
				systray.Quit()
			}()
			return
		}
	}
	log.Logger(trayCtx).Error("Could not send 'quit' message, quitting now")
	beforeExit()
	systray.Quit()
}
