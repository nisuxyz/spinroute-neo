package main

import (
	batchqueue "gbfs-service/internal/batch-queue"
	citybikeswebsocket "gbfs-service/internal/citybik.es-websocket"
	supabaseClient "gbfs-service/internal/supabase"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	log.Println("🚀 Starting SpinRoute CityBikes WebSocket Consumer")

	// Initialize Supabase client
	if err := supabaseClient.InitSupabase(); err != nil {
		log.Fatalf("❌ Failed to initialize Supabase client: %v", err)
	}

	// Bootstrap networks from API sources before starting WebSocket consumer
	// This ensures all networks exist in the database before we receive station updates
	if err := supabaseClient.BootstrapNetworks(); err != nil {
		log.Printf("⚠️  Network bootstrap failed: %v (continuing anyway)", err)
	}

	// Create batch queue for efficient database writes
	bucket := batchqueue.CreateBatchQueue(100, 10*time.Second)

	// Start WebSocket consumer
	go citybikeswebsocket.ConnectToCityBikes(bucket)

	// Simple health check endpoint
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	// Start HTTP server for health checks
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	server := &http.Server{
		Addr:    ":" + port,
		Handler: http.DefaultServeMux,
	}

	// Run server in goroutine
	go func() {
		log.Printf("✅ HTTP server starting on port %s", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("❌ HTTP server error: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("🛑 Shutting down server...")
	server.Close()
	log.Println("✅ Server stopped")
}
