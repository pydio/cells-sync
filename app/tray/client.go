package tray

import (
	"context"
	"fmt"
	"sort"
	"sync"
	"time"

	"github.com/gorilla/websocket"

	"github.com/pydio/cells/common/log"
	"github.com/pydio/cells/common/service"
	"github.com/pydio/sync/common"
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
				log.Logger(context.Background()).Info("Trying to reconnect...")
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
	return service.Retry(func() error {
		conn, _, err := websocket.DefaultDialer.Dial("ws://localhost:3636/status", nil)
		if err == nil {
			go c.bindConn(conn)
			c.Status <- StatusConnected
			log.Logger(context.Background()).Info("Opened WS Connection")
		} else {
			log.Logger(context.Background()).Info("Error while opening WS Connection " + err.Error())
		}
		return err
	}, 6*time.Second, 30*time.Second)
}

func (c *Client) Close() {
	c.closing = true
	if c.conn != nil {
		log.Logger(context.Background()).Info("Closing WS Connection...")
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
		for {
			messageType, message, err := conn.ReadMessage()
			if c.closing {
				return
			}
			if err != nil {
				log.Logger(context.Background()).Info("Got Error: " + err.Error())
				c.Status <- StatusDisconnected
				c.Reconnect()
				return
			}
			if messageType == websocket.TextMessage {
				m := common.MessageFromData(message)
				switch m.Type {
				case "STATE":
					content, ok := m.Content.(*common.ConcreteSyncState)
					if ok {
						log.Logger(context.Background()).Debug(fmt.Sprintf("Got state for sync %s - Status %d", content.Config.Label, content.Status))
						c.Lock()
						prev, hasPrev := c.tasks[content.Config.Uuid]
						c.tasks[content.Config.Uuid] = content
						c.Unlock()
						if !hasPrev || prev.Status != content.Status {
							//c.Tasks <- c.tasks
							c.SendOrderedTasks()
						}
					}
				case "PONG":
					c.Lock()
					c.tasks = make(map[string]*common.ConcreteSyncState)
					c.Unlock()
				case "ERROR":
					log.Logger(context.Background()).Error("Could not parse message")
				}
			}
		}
	}()
	conn.WriteJSON(&common.Message{Type: "PING"})
}
