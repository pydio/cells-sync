package main

import (
	"fmt"
	"sync"
	"time"

	"github.com/pydio/sync/common"

	"github.com/pydio/cells/common/log"
	"golang.org/x/net/context"

	"github.com/gorilla/websocket"
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
	Tasks   chan map[string]*common.SyncState
	done    chan bool
	closing bool
	tasks   map[string]*common.SyncState
}

func NewClient() *Client {
	c := &Client{
		Status: make(chan StatusMessage, 10),
		Errors: make(chan error, 10),
		Tasks:  make(chan map[string]*common.SyncState, 1),
		done:   make(chan bool),
		tasks:  make(map[string]*common.SyncState),
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
				log.Logger(context.Background()).Info("MESSAGE: " + string(message))
				m := common.MessageFromData(message)
				switch m.Type {
				case "STATE":
					content, ok := m.Content.(*common.SyncState)
					fmt.Println("Content is *config.Task", content)
					if !ok {
					}
					c.Lock()
					c.tasks[content.Config.Uuid] = content
					c.Unlock()
					c.Tasks <- c.tasks
				case "PONG":
					c.Lock()
					c.tasks = make(map[string]*common.SyncState)
					c.Unlock()
				case "ERROR":
					log.Logger(context.Background()).Error("Could not parse message")
				}
			}
		}
	}()
	conn.WriteJSON(&common.Message{Type: "PING"})
}
