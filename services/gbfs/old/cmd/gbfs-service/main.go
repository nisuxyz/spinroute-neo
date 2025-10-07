package main

import (
	batchqueue "gbfs-service/internal/batch-queue"
	citybikeswebsocket "gbfs-service/internal/citybik.es-websocket"
	"gbfs-service/internal/envkeys"
	"log"
	"time"

	"github.com/supabase-community/supabase-go"
)

// Add these constants at the top with other variables
var (
// logUpserts            = os.Getenv("LOG_UPSERTS") == "true"
// websocketPingInterval = 25 * time.Second
// consumeWS = os.Getenv("CONSUME_WS") != "false"
// maxReconnectAttempts  = 10              // Maximum reconnection attempts before giving up
// baseReconnectDelay    = 5 * time.Second // Base delay between reconnection attempts
)

// check environment variables for LOG_UPSERTS flag
// var logUpserts = os.Getenv("LOG_UPSERTS") == "true"
// var websocketPingInterval = 25 * time.Second       // Default ping interval
// var consumeWS = os.Getenv("CONSUME_WS") != "false" // Set to false to disable WebSocket consumption

func main() {
	// ---------------------------------------------------------------
	// citybik.es websocket handler
	// ---------------------------------------------------------------
	log.Println("Starting citybik.es WebSocket client...")

	bucket := batchqueue.CreateBatchQueue(100, 10*time.Second) // 100 records max, empty every 10 seconds

	options := &supabase.ClientOptions{
		Schema: "bikeshare", // defaults to "public"
	}
	client, err := supabase.NewClient(envkeys.Environment.SupabaseURL, envkeys.Environment.SupabaseKey, options)

	if err != nil {
		log.Print(envkeys.Environment.SupabaseURL, envkeys.Environment.SupabaseKey)
		log.Fatal("Could not connect to database: ", err)
	}

	if false {
		citybikeswebsocket.BootstrapNetworks(client)
	}

	citybikeswebsocket.ConnectToCityBikes(client, bucket)
}
