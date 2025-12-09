package citybikeswebsocket

import (
	"encoding/json"
	"fmt"
	batchqueue "gbfs-service/internal/batch-queue"
	stationMapper "gbfs-service/internal/station-mapper"
	"gbfs-service/internal/uuidfy"
	"log"
	"strings"
	"time"

	"github.com/gorilla/websocket"
)

// processWebSocketMessage extracts message processing logic into a separate function
func processWebSocketMessage(msg string, stationQueue *batchqueue.BatchQueue) error {
	// Socket.IO packet types:
	// 0 = open, 1 = close, 2 = ping, 3 = pong, 4 = message
	switch {
	case msg == "3":
		// Pong received, ignore
		return nil

	case strings.HasPrefix(msg, "42"):
		// This is a Socket.IO event message
		// Remove the "42" prefix to get the JSON array
		jsonStr := msg[2:]

		// Parse the event array
		var eventArray []json.RawMessage
		if err := json.Unmarshal([]byte(jsonStr), &eventArray); err != nil {
			log.Printf("⚠️ Failed to parse event: %v", err)
			return err
		}

		// Get event name
		var eventName string
		if len(eventArray) > 0 {
			if err := json.Unmarshal(eventArray[0], &eventName); err == nil {
				if Config.verbose {
					log.Printf("📬 Event type: %s", eventName)
				}
				if eventName == "diff" && len(eventArray) > 1 {
					// Process the diff event
					return processDiffEvent(eventArray[1], stationQueue)
				}
			}
		}

	default:
		if Config.verbose {
			log.Printf("🔍 Unknown message type: %s", msg[:min(len(msg), 50)])
		}
	}

	return nil
}

// Extract diff processing logic - WebSocket only sends station updates
func processDiffEvent(diffRaw json.RawMessage, stationQueue *batchqueue.BatchQueue) error {
	// Parse the diff data
	var diffData map[string]any
	if err := json.Unmarshal(diffRaw, &diffData); err != nil {
		return fmt.Errorf("failed to parse diff data: %v", err)
	}

	// Extract specific fields
	message, ok := diffData["message"].(map[string]any)
	if !ok {
		return nil
	}

	action, _ := message["action"].(string)
	n, _ := message["n"].(float64)
	network, _ := message["network"].(string)

	// Process station update
	station, ok := message["station"].(map[string]any)
	if !ok {
		return nil
	}

	return processStationUpdate(station, network, action, int(n), stationQueue)
}

// processStationUpdate handles station diff events
func processStationUpdate(station map[string]any, network, action string, n int, bucket *batchqueue.BatchQueue) error {
	name, _ := station["name"].(string)
	networkId, _ := uuidfy.UUIDfy(network)

	if Config.verbose {
		log.Printf("🚲 Station update - network: %q (%s), station: %q, action: %s, bikes: %d",
			network, networkId, name, action, n)
	}

	// Map the station data to Supabase format
	mappedStation, err := stationMapper.MapStationData(station, network)
	if err != nil {
		return fmt.Errorf("failed to map station data: %v", err)
	}

	// Add the mapped station to the bucket
	bucket.Add(mappedStation)

	// Check if the bucket is full or needs to be emptied
	if bucket.IsFull() {
		if err := bucket.FlushQueue(); err != nil {
			log.Printf("Failed to flush station bucket: %v", err)
		}
	}

	return nil
}

// handleConnection handles an active WebSocket connection
func handleConnection(conn *websocket.Conn, stationQueue *batchqueue.BatchQueue) bool {
	defer conn.Close()

	// Channel to signal when to stop the ping goroutine
	stopPing := make(chan struct{})
	defer close(stopPing)

	// Handle ping/pong to keep connection alive
	go func() {
		ticker := time.NewTicker(Config.websocketPingInterval)
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				if err := conn.WriteMessage(websocket.TextMessage, []byte("2")); err != nil {
					log.Printf("⚠️ Ping failed: %v", err)
					return
				}
			case <-stopPing:
				return
			}
		}
	}()

	// Periodic flush for queue that hasn't reached capacity
	go func() {
		ticker := time.NewTicker(10 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				// Flush station queue if it has records and is past max age
				if stationQueue.IsFull() {
					if err := stationQueue.FlushQueue(); err != nil {
						log.Printf("⚠️ Periodic station flush failed: %v", err)
					}
				}
			case <-stopPing:
				return
			}
		}
	}()

	// Read messages
	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			log.Printf("❌ Read error: %v", err)

			// Check if it's a normal closure (user requested shutdown)
			if websocket.IsCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway) {
				return true // Don't reconnect
			}

			// For other errors (like 1006), we should reconnect
			return false
		}

		msg := string(message)

		// Process the message
		if err := processWebSocketMessage(msg, stationQueue); err != nil {
			log.Printf("⚠️ Error processing message: %v", err)
			// Continue processing other messages
		}
	}
}

// ConnectToCityBikes establishes WebSocket connection with retry logic
func ConnectToCityBikes(stationQueue *batchqueue.BatchQueue) {
	attempts := 0

	for {
		attempts++
		log.Printf("🔄 Attempting to connect to CityBikes (attempt %d/%d)...", attempts, Config.maxReconnectAttempts)

		// Calculate exponential backoff delay (but cap it at 2 minutes)
		delay := time.Duration(attempts-1) * time.Duration(Config.baseReconnectDelay)
		if delay > 2*time.Minute {
			delay = 2 * time.Minute
		}

		if attempts > 1 {
			log.Printf("⏳ Waiting %v before reconnection attempt...", delay)
			time.Sleep(delay)
		}

		// Try to establish connection
		conn, _, err := websocket.DefaultDialer.Dial("wss://ws.citybik.es/socket.io/?EIO=3&transport=websocket", nil)
		if err != nil {
			log.Printf("❌ CityBikes connection failed (attempt %d): %v", attempts, err)

			if attempts >= Config.maxReconnectAttempts {
				log.Printf("💀 Maximum reconnection attempts reached. Giving up.")
				return
			}
			continue
		}

		log.Println("✅ Connected to CityBikes! Listening for station updates...")

		// Reset attempt counter on successful connection
		attempts = 0

		// Handle the connection - this will block until connection fails
		if handleConnection(conn, stationQueue) {
			// If handleConnection returns true, it means we should stop trying to reconnect
			log.Println("🛑 WebSocket handler requested shutdown")
			return
		}

		// Connection failed, loop will retry
		log.Println("🔄 Connection lost, attempting to reconnect...")
	}
}

// Helper function for min
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
