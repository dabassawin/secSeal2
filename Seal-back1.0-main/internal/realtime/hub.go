package realtime

import (
	"log"
	"sync"

	"github.com/gofiber/websocket/v2"
)

type Hub struct {
	// Clients maps peaCode to a map of connections
	clients    map[string]map[*websocket.Conn]bool
	register   chan *clientInfo
	unregister chan *clientInfo
	broadcast  chan *broadcastMessage
	mu         sync.RWMutex
}

type clientInfo struct {
	peaCode string
	conn    *websocket.Conn
}

type broadcastMessage struct {
	peaCode string
	message string
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[string]map[*websocket.Conn]bool),
		register:   make(chan *clientInfo),
		unregister: make(chan *clientInfo),
		broadcast:  make(chan *broadcastMessage),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			if h.clients[client.peaCode] == nil {
				h.clients[client.peaCode] = make(map[*websocket.Conn]bool)
			}
			h.clients[client.peaCode][client.conn] = true
			h.mu.Unlock()
			log.Printf("Client registered for PEA: %s", client.peaCode)

		case client := <-h.unregister:
			h.mu.Lock()
			if connections, ok := h.clients[client.peaCode]; ok {
				if _, exists := connections[client.conn]; exists {
					delete(connections, client.conn)
					client.conn.Close()
					if len(connections) == 0 {
						delete(h.clients, client.peaCode)
					}
				}
			}
			h.mu.Unlock()
			log.Printf("Client unregistered from PEA: %s", client.peaCode)

		case bm := <-h.broadcast:
			h.mu.RLock()
			if connections, ok := h.clients[bm.peaCode]; ok {
				for conn := range connections {
					err := conn.WriteMessage(websocket.TextMessage, []byte(bm.message))
					if err != nil {
						log.Printf("Broadcast error to PEA %s: %v", bm.peaCode, err)
						conn.Close()
						// Trigger unregister internally in next loop if we wanted to be more robust
					}
				}
			}
			h.mu.RUnlock()
		}
	}
}

func (h *Hub) Register(peaCode string, conn *websocket.Conn) {
	h.register <- &clientInfo{peaCode: peaCode, conn: conn}
}

func (h *Hub) Unregister(peaCode string, conn *websocket.Conn) {
	h.unregister <- &clientInfo{peaCode: peaCode, conn: conn}
}

func (h *Hub) Broadcast(peaCode string, message string) {
	h.broadcast <- &broadcastMessage{peaCode: peaCode, message: message}
}
