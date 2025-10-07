package citybikeswebsocket

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	batchqueue "gbfs-service/internal/batch-queue"
	"gbfs-service/internal/uuidfy"
	"log"
	"net/http"
	"os"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/supabase-community/supabase-go"
)

// BootstrapNetworks runs the network bootstrap logic at startup.
func BootstrapNetworks(dbClient *supabase.Client) {
	log.Println("Bootstrapping networks...")
	err := refreshNetworks(dbClient)
	if err != nil {
		log.Printf("Error refreshing networks: %v", err)
	} else {
		log.Println("Network bootstrap complete.")
	}
}

// fetchURL makes an HTTP GET request and returns the parsed JSON response
func fetchURL(url string) (map[string]any, error) {
	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch URL %s: %v", url, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP %d error fetching %s", resp.StatusCode, url)
	}

	var data map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, fmt.Errorf("failed to decode JSON from %s: %v", url, err)
	}

	return data, nil
}

// CSVLogger handles writing records to CSV with dynamic column addition
type CSVLogger struct {
	filePath string
	headers  []string
	mutex    sync.Mutex
}

var failedUpsertLogger *CSVLogger
var loggerOnce sync.Once

// getFailedUpsertLogger returns a singleton CSV logger for failed upserts
func getFailedUpsertLogger() *CSVLogger {
	loggerOnce.Do(func() {
		failedUpsertLogger = &CSVLogger{
			filePath: "failed_upserts.csv",
			headers:  []string{},
		}
	})
	return failedUpsertLogger
}

// flattenRecord converts a nested map[string]any to a flat map with dot notation
func flattenRecord(record map[string]any, prefix string) map[string]string {
	result := make(map[string]string)

	for key, value := range record {
		fullKey := key
		if prefix != "" {
			fullKey = prefix + "." + key
		}

		switch v := value.(type) {
		case map[string]any:
			// Recursively flatten nested objects
			nested := flattenRecord(v, fullKey)
			for nestedKey, nestedValue := range nested {
				result[nestedKey] = nestedValue
			}
		case []any:
			// Convert arrays to JSON strings
			if jsonBytes, err := json.Marshal(v); err == nil {
				result[fullKey] = string(jsonBytes)
			} else {
				result[fullKey] = fmt.Sprintf("%v", v)
			}
		case nil:
			result[fullKey] = ""
		default:
			// Convert all other types to strings
			result[fullKey] = fmt.Sprintf("%v", v)
		}
	}

	return result
}

// writeRecord writes a record to the CSV file, adding new columns as needed
func (logger *CSVLogger) writeRecord(record map[string]any) error {
	logger.mutex.Lock()
	defer logger.mutex.Unlock()

	// Flatten the record
	flatRecord := flattenRecord(record, "")

	// Check if file exists to determine if we need headers
	fileExists := true
	if _, err := os.Stat(logger.filePath); os.IsNotExist(err) {
		fileExists = false
	}

	// Get all keys from the current record
	var recordKeys []string
	for key := range flatRecord {
		recordKeys = append(recordKeys, key)
	}
	sort.Strings(recordKeys) // Sort for consistency

	// Update headers if we have new columns
	headersChanged := false
	if !fileExists || len(logger.headers) == 0 {
		logger.headers = recordKeys
		headersChanged = true
	} else {
		// Check for new columns
		existingHeaders := make(map[string]bool)
		for _, header := range logger.headers {
			existingHeaders[header] = true
		}

		for _, key := range recordKeys {
			if !existingHeaders[key] {
				logger.headers = append(logger.headers, key)
				headersChanged = true
			}
		}

		if headersChanged {
			sort.Strings(logger.headers) // Re-sort after adding new columns
		}
	}

	// If headers changed and file exists, we need to rewrite the entire file
	if headersChanged && fileExists {
		if err := logger.rewriteFileWithNewHeaders(flatRecord); err != nil {
			return fmt.Errorf("failed to rewrite CSV with new headers: %v", err)
		}
	} else {
		// Append to file (or create new file)
		file, err := os.OpenFile(logger.filePath, os.O_WRONLY|os.O_CREATE|os.O_APPEND, 0644)
		if err != nil {
			return fmt.Errorf("failed to open CSV file: %v", err)
		}
		defer file.Close()

		writer := csv.NewWriter(file)
		defer writer.Flush()

		// Write headers if new file
		if !fileExists {
			if err := writer.Write(logger.headers); err != nil {
				return fmt.Errorf("failed to write CSV headers: %v", err)
			}
		}

		// Write record
		row := make([]string, len(logger.headers))
		for i, header := range logger.headers {
			if value, exists := flatRecord[header]; exists {
				row[i] = value
			} else {
				row[i] = "" // Empty value for missing columns
			}
		}

		if err := writer.Write(row); err != nil {
			return fmt.Errorf("failed to write CSV record: %v", err)
		}
	}

	return nil
}

// rewriteFileWithNewHeaders reads existing CSV, adds new columns, and rewrites
func (logger *CSVLogger) rewriteFileWithNewHeaders(newRecord map[string]string) error {
	// Read existing records
	file, err := os.Open(logger.filePath)
	if err != nil {
		return err
	}

	reader := csv.NewReader(file)
	records, err := reader.ReadAll()
	file.Close()
	if err != nil {
		return err
	}

	if len(records) == 0 {
		return nil
	}

	// Get old headers
	oldHeaders := records[0]
	existingRecords := records[1:]

	// Create new file
	newFile, err := os.Create(logger.filePath)
	if err != nil {
		return err
	}
	defer newFile.Close()

	writer := csv.NewWriter(newFile)
	defer writer.Flush()

	// Write new headers
	if err := writer.Write(logger.headers); err != nil {
		return err
	}

	// Rewrite existing records with new column structure
	for _, existingRecord := range existingRecords {
		row := make([]string, len(logger.headers))

		// Map old data to new structure
		for i, header := range logger.headers {
			found := false
			for j, oldHeader := range oldHeaders {
				if header == oldHeader && j < len(existingRecord) {
					row[i] = existingRecord[j]
					found = true
					break
				}
			}
			if !found {
				row[i] = "" // Empty for new columns
			}
		}

		if err := writer.Write(row); err != nil {
			return err
		}
	}

	// Write the new record
	row := make([]string, len(logger.headers))
	for i, header := range logger.headers {
		if value, exists := newRecord[header]; exists {
			row[i] = value
		} else {
			row[i] = ""
		}
	}

	return writer.Write(row)
}

// refreshNetworks fetches and updates network data from API sources
func refreshNetworks(dbClient *supabase.Client) error {
	log.Println("Refreshing networks...")

	// 1. Fetch all active API sources
	data, _, err := dbClient.From("api_source").Select("*", "exact", false).Eq("active", "true").Execute()
	if err != nil {
		return fmt.Errorf("failed to fetch API sources: %v", err)
	}

	var apiSources []map[string]any
	if err := json.Unmarshal(data, &apiSources); err != nil {
		return fmt.Errorf("failed to parse API sources: %v", err)
	}

	if len(apiSources) == 0 {
		log.Println("No active API sources found for networks.")
		return nil
	}

	// 2. Process each API source
	for _, source := range apiSources {
		name, _ := source["name"].(string)
		discoveryURL, _ := source["discovery_url"].(string)
		isGBFS, _ := source["is_gbfs"].(bool)

		log.Printf("Fetching networks from source: %s %s", name, discoveryURL)

		// Skip GBFS sources for now (as in JS version)
		if isGBFS {
			log.Printf("TODO: Handle GBFS source discovery. Skipping %s for now.", name)
			continue
		}

		// 3. Fetch data from discovery URL
		discoveryData, err := fetchURL(discoveryURL)
		if err != nil {
			log.Printf("Error fetching networks from %s: %v", name, err)
			continue
		}

		// 4. Parse networks
		networksData, ok := discoveryData["networks"]
		if !ok {
			log.Printf("No networks found in data from %s.", name)
			continue
		}

		networks, ok := networksData.([]any)
		if !ok || len(networks) == 0 {
			log.Printf("No networks found in data from %s.", name)
			continue
		}

		log.Printf("Found %d networks in %s", len(networks), name)

		// 5. Process each network
		for _, networkData := range networks {
			network, ok := networkData.(map[string]any)
			if !ok {
				continue
			}

			// Validate required fields
			networkID, hasID := network["id"].(string)
			networkName, hasName := network["name"].(string)
			location, hasLocation := network["location"].(map[string]any)
			if !hasID || !hasName || !hasLocation {
				log.Printf("Skipping network with missing fields in %s: %v", name, network)
				continue
			}

			// Generate UUID for network
			networkRecordID, err := uuidfy.UUIDfy(networkID)
			if err != nil {
				log.Printf("Failed to generate UUID for network %s: %v", networkID, err)
				continue
			}

			// Extract location data
			latitude, _ := location["latitude"].(float64)
			longitude, _ := location["longitude"].(float64)
			city, _ := location["city"].(string)
			country, _ := location["country"].(string)

			// Extract company data
			var companyStr string
			if companies, ok := network["company"].([]any); ok {
				var companyNames []string
				for _, comp := range companies {
					if compName, ok := comp.(string); ok {
						companyNames = append(companyNames, compName)
					}
				}
				companyStr = strings.Join(companyNames, ", ")
			}

			// Build network record
			networkRecord := map[string]any{
				"id":                      networkRecordID,
				"name":                    networkName,
				"company":                 companyStr,
				"location":                fmt.Sprintf("POINT(%f %f)", longitude, latitude),
				"city":                    city,
				"country":                 country,
				"station_status_url":      fmt.Sprintf("https://api.citybik.es/gbfs/3/%s/station_status.json", networkID),
				"station_information_url": fmt.Sprintf("https://api.citybik.es/gbfs/3/%s/station_information.json", networkID),
				"vehicle_status_url":      fmt.Sprintf("https://api.citybik.es/gbfs/3/%s/vehicle_status.json", networkID),
				"raw_data":                network,
			}

			// 6. Upsert network record
			_, _, err = dbClient.From("network").Upsert(networkRecord, "id", "minimal", "exact").Execute()
			if err != nil {
				log.Printf("Failed to save network %s: %v", networkName, err)
				continue
			}

			log.Printf("Saved network: %s", networkName)
		}
	}

	log.Println("Network refresh completed successfully")
	return nil
}

// Extract message processing logic into a separate function
func processWebSocketMessage(msg string, dbClient *supabase.Client, bucket *batchqueue.BatchQueue) error {
	// Socket.IO packet types:
	// 0 = open, 1 = close, 2 = ping, 3 = pong, 4 = message
	switch {
	case msg == "3":
		// Pong received, ignore
		return nil

	case strings.HasPrefix(msg, "42"):
		// This is a Socket.IO event message
		// Remove the "42" prefix to get the JSON array
		jsonData := msg[2:]

		// Parse the event array
		var event []json.RawMessage
		if err := json.Unmarshal([]byte(jsonData), &event); err != nil {
			return fmt.Errorf("failed to parse event: %v", err)
		}

		if len(event) < 2 {
			return nil
		}

		// Get event name
		var eventName string
		if err := json.Unmarshal(event[0], &eventName); err != nil {
			return fmt.Errorf("failed to parse event name: %v", err)
		}

		if eventName == "diff" {
			return processDiffEvent(event[1], dbClient, bucket)
		} else {
			if Config.verbose {
				log.Printf("📨 Event: %s", eventName)
			}
		}

	default:
		if Config.verbose {
			log.Printf("📦 Raw message: %s", msg)
		}
	}

	return nil
}

// Extract diff processing logic
func processDiffEvent(diffRaw json.RawMessage, dbClient *supabase.Client, bucket *batchqueue.BatchQueue) error {
	// Parse the diff data
	var diffData map[string]any
	if err := json.Unmarshal(diffRaw, &diffData); err != nil {
		return fmt.Errorf("failed to parse diff data: %v", err)
	}

	// Pretty print the diff event
	if Config.verbose {
		prettyJSON, _ := json.MarshalIndent(diffData, "", "  ")
		fmt.Printf("\n🚲 Bike station update:\n%s\n", string(prettyJSON))
	}

	// Extract specific fields
	message, ok := diffData["message"].(map[string]any)
	if !ok {
		return nil
	}

	action, _ := message["action"].(string)
	n, _ := message["n"].(float64)
	network, _ := message["network"].(string)

	station, ok := message["station"].(map[string]any)
	if !ok {
		return nil
	}

	name, _ := station["name"].(string)
	networkId, _ := uuidfy.UUIDfy(network)

	if Config.verbose {
		fmt.Printf("➡️  %s: %d bike(s) at %s (%s)\n", action, int(n), name, networkId)
	}

	// Map the station data to PocketBase format
	mappedStation, err := MapStationData(station, network)
	if err != nil {
		log.Printf("❌ Mapping error for station data: %v", err)

		// Log mapping failures to CSV for analysis
		logger := getFailedUpsertLogger()
		stationWithError := map[string]any{
			"original_station": station,
			"network":          network,
			"error_message":    err.Error(),
			"error_type":       "mapping_error",
			"timestamp":        time.Now().UTC().Format("2006-01-02 15:04:05.000Z"),
		}
		if logErr := logger.writeRecord(stationWithError); logErr != nil {
			log.Printf("Failed to log mapping error to CSV: %v", logErr)
		} else {
			log.Printf("Logged mapping error record to %s", logger.filePath)
		}

		return fmt.Errorf("failed to map station data: %v", err)
	}

	// Print the mapped station data
	if Config.verbose {
		prettyMappedJSON, _ := json.MarshalIndent(mappedStation, "", "  ")
		fmt.Printf("Mapped Station:\n%s\n", string(prettyMappedJSON))
	}

	// Add the mapped station to the bucket
	bucket.Add(mappedStation)

	// Check if the bucket is full or needs to be emptied
	if bucket.IsFull() {
		FLUSH_COUNT = 0
		if err := bucket.FlushQueue(dbClient, UpsertStation); err != nil {
			log.Printf("❌ Failed to flush batch queue: %v", err)

			// Log batch flush failures to CSV for analysis
			logger := getFailedUpsertLogger()
			batchErrorRecord := map[string]any{
				"error_message": err.Error(),
				"error_type":    "batch_flush_error",
				"timestamp":     time.Now().UTC().Format("2006-01-02 15:04:05.000Z"),
			}
			if logErr := logger.writeRecord(batchErrorRecord); logErr != nil {
				log.Printf("Failed to log batch flush error to CSV: %v", logErr)
			} else {
				log.Printf("Logged batch flush error record to %s", logger.filePath)
			}
		}
		log.Printf("✅ Flushed batch queue successfully (%d items)", FLUSH_COUNT)
		FLUSH_COUNT = 0
	}

	return nil
}

// Separate function to handle an active WebSocket connection
func handleConnection(conn *websocket.Conn, dbClient *supabase.Client, bucket *batchqueue.BatchQueue) bool {
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

		// Process the message (your existing logic)
		if err := processWebSocketMessage(msg, dbClient, bucket); err != nil {
			log.Printf("⚠️ Error processing message: %v", err)
			// Continue processing other messages
		}
	}
}

// WebSocket connection with retry logic
func ConnectToCityBikes(dbClient *supabase.Client, bucket *batchqueue.BatchQueue) {
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

		log.Println("✅ Connected to CityBikes! Listening for messages...")

		// Reset attempt counter on successful connection
		attempts = 0

		// Handle the connection - this will block until connection fails
		if handleConnection(conn, dbClient, bucket) {
			// If handleConnection returns true, it means we should stop trying to reconnect
			log.Println("🛑 WebSocket handler requested shutdown")
			return
		}

		// Connection failed, loop will retry
		log.Println("🔄 Connection lost, attempting to reconnect...")
	}
}

// MapStationData transforms WebSocket station data to PocketBase bs_stations format
func MapStationData(stationData map[string]any, networkName string) (map[string]any, error) {
	// Generate station ID using uuidfy
	stationId, ok := stationData["id"].(string)
	if !ok {
		return nil, fmt.Errorf("station id not found or not a string")
	}

	mappedStationId, err := uuidfy.UUIDfy(stationId)
	if err != nil {
		return nil, fmt.Errorf("failed to generate station ID: %v", err)
	}

	// Generate network ID using uuidfy
	networkId, err := uuidfy.UUIDfy(networkName)
	if err != nil {
		return nil, fmt.Errorf("failed to generate network ID: %v", err)
	}

	// Extract basic station info
	name, _ := stationData["name"].(string)
	latitude, _ := stationData["latitude"].(float64)
	longitude, _ := stationData["longitude"].(float64)
	freeBikes, _ := stationData["free_bikes"].(float64)
	emptySlots, _ := stationData["empty_slots"].(float64)
	timestamp, _ := stationData["timestamp"].(string)

	// Parse timestamp
	var lastReported *time.Time
	if timestamp != "" {
		parsed := parseTimestampFlexible(timestamp)
		if parsed != nil {
			lastReported = parsed
			// log.Print("Parsed timestamp as RFC3339: ", parsed.Format("2006-01-02 15:04:05.000Z"))
		} else {
			log.Printf("⚠️ Warning: failed to parse timestamp '%s': %v", timestamp, err)
		}
	}

	// log.Print("Last reported time: ", lastReported.Format("2006-01-02 15:04:05.000Z"))
	// log.Print("Last reported raw: ", lastReported, " | ", timestamp)

	// Extract extra data
	extra, _ := stationData["extra"].(map[string]any)

	// Calculate capacity - try multiple sources
	var capacity *int
	if emptySlots >= 0 && freeBikes >= 0 {
		// Calculate from available data
		totalCapacity := int(emptySlots + freeBikes)
		capacity = &totalCapacity
	} else if extra != nil {
		// Try to get from extra.slots
		if slots, ok := extra["slots"].(float64); ok && slots > 0 {
			slotCount := int(slots)
			capacity = &slotCount
		}
	}

	// Extract address from extra data
	// log.Print("\n\nExtra data: ", extra)
	// log.Print("\n\nAddress: ", extra["address"])
	// log.Print("\n\nStation data: ", stationData)

	var address *string
	if extra != nil {
		if addr, ok := extra["address"].(string); ok && addr != "" {
			address = &addr
		}
	}

	// Extract operational status from extra data
	var isRenting, isReturning *bool
	if extra != nil {
		if rentingVal, ok := extra["renting"]; ok {
			switch v := rentingVal.(type) {
			case bool:
				isRenting = &v
			case float64:
				b := v != 0
				isRenting = &b
			}
		}
		if returningVal, ok := extra["returning"]; ok {
			switch v := returningVal.(type) {
			case bool:
				isReturning = &v
			case float64:
				b := v != 0
				isReturning = &b
			}
		}
	}

	// Build vehicle types available from extra data
	var vehicleTypes map[string]any
	if extra != nil {
		types := make(map[string]any)

		if normalBikes, ok := extra["normal_bikes"].(float64); ok {
			types["normal_bikes"] = int(normalBikes)
		}
		if ebikes, ok := extra["ebikes"].(float64); ok {
			types["ebikes"] = int(ebikes)
		}
		if hasEbikes, ok := extra["has_ebikes"].(bool); ok {
			types["has_ebikes"] = hasEbikes
		}

		if len(types) > 0 {
			vehicleTypes = types
		}
	}

	// Build the mapped station record with all required fields
	mappedStation := map[string]any{
		"id":                      mappedStationId,
		"network_id":              networkId,
		"name":                    name,
		"location":                fmt.Sprintf("POINT(%f %f)", longitude, latitude),
		"num_vehicles_available":  int(freeBikes),
		"num_docks_available":     int(emptySlots),                                     // Default to 0 if negative
		"capacity":                0,                                                   // Default capacity
		"last_reported":           time.Now().UTC().Format("2006-01-02 15:04:05.000Z"), // Default to current time
		"vehicle_types_available": map[string]any{},                                    // Default empty object
		"raw_data":                stationData,
	}

	// Override with calculated values if available
	if capacity != nil {
		mappedStation["capacity"] = *capacity
	} else {
		// Try to calculate from available data
		totalDocks := int(freeBikes)
		if emptySlots >= 0 {
			totalDocks += int(emptySlots)
		}
		mappedStation["capacity"] = totalDocks
	}

	// Ensure num_docks_available is non-negative
	if emptySlots < 0 {
		mappedStation["num_docks_available"] = 0
	}

	// Add optional fields
	if address != nil {
		mappedStation["address"] = *address
	}
	if isRenting != nil {
		mappedStation["is_renting"] = *isRenting
	}
	if isReturning != nil {
		mappedStation["is_returning"] = *isReturning
	}
	if lastReported != nil {
		mappedStation["last_reported"] = lastReported.Format("2006-01-02 15:04:05.000Z")
	}
	if vehicleTypes != nil {
		mappedStation["vehicle_types_available"] = vehicleTypes
	}

	return mappedStation, nil
}

var FLUSH_COUNT int = 0

func UpsertStation(dbClient *supabase.Client, station map[string]any) error {
	// try getting the record by id
	stationId, _ := station["id"].(string)
	// address, _ := station["address"].(string)
	// capacity, _ := station["capacity"].(int)
	name, _ := station["name"].(string)
	// networkId, _ := station["network_id"].(string)
	// numDocksAvailable, _ := station["num_docks_available"].(int)
	// numVehiclesAvailable, _ := station["num_vehicles_available"].(int)
	// // raw data as json string
	// rawDataBytes, err := json.Marshal(station["raw_data"])
	// isRenting, _ := station["is_renting"].(bool)
	// isReturning, _ := station["is_returning"].(bool)
	// // lastReported as datetime
	// lastReported, _ := station["last_reported"].(string)
	// lastReportedTime, err := time.Parse("2006-01-02 15:04:05.000Z", lastReported)
	// vehicleTypesAvailableBytes, err := json.Marshal(station["vehicle_types_available"])

	// log entire station map for debugging
	// prettyStation, _ := json.MarshalIndent(station, "", "  ")
	// log.Printf("Upserting station data:\n%s", string(prettyStation))

	// log.Printf("Upserting station %s (%s) in network %s", name, stationId, networkId)

	// str := dbClient.Rpc("debug_whoami", "exact", map[string]any{})

	// log.Print(str)

	data, count, err := dbClient.From("station").Upsert(station, "id", "minimal", "exact").Execute()

	if err != nil {
		log.Printf("❌ Database error when upserting station %s (%s): %v", name, stationId, err)

		// Create a copy of the station data and add error information
		stationWithError := make(map[string]any)
		for k, v := range station {
			stationWithError[k] = v
		}
		stationWithError["error_message"] = err.Error()
		stationWithError["error_type"] = "database_error"

		// Log the failed record to CSV for analysis
		logger := getFailedUpsertLogger()
		if logErr := logger.writeRecord(stationWithError); logErr != nil {
			log.Printf("Failed to log failed upsert to CSV: %v", logErr)
		} else {
			log.Printf("Logged failed upsert record with error to %s", logger.filePath)
		}
		return err
	}

	// log.Printf("Upsert result: %d rows affected", count)

	if count == 0 {
		log.Printf("⚠️ Warning: No rows affected when upserting station %s (%s)", name, stationId)

		// Create a copy of the station data and add error information
		stationWithError := make(map[string]any)
		for k, v := range station {
			stationWithError[k] = v
		}
		stationWithError["error_message"] = "No rows affected - possible constraint violation or data issue"
		stationWithError["error_type"] = "zero_rows_affected"

		// Log the failed record to CSV for analysis
		logger := getFailedUpsertLogger()
		if logErr := logger.writeRecord(stationWithError); logErr != nil {
			log.Printf("Failed to log failed upsert to CSV: %v", logErr)
		} else {
			log.Printf("Logged failed upsert record to %s", logger.filePath)
		}
	}

	var upserted map[string]any
	if len(data) > 0 {
		if err := json.Unmarshal(data, &upserted); err != nil {
			log.Printf("failed to unmarshal upserted data: %v", err)
		}
	}

	FLUSH_COUNT++

	// log upserted record
	// prettyJSON, _ := json.MarshalIndent(upserted, "", "  ")
	// log.Printf("Upserted station record:\n%s", string(prettyJSON))

	// upserted, err := dbClient.Station.UpsertOne(
	// 	db.Station.ID.Equals(stationId),
	// ).Create(
	// 	db.Station.Name.Set(name),
	// 	db.Station.Address.Set(address),
	// 	db.Station.Capacity.Set(capacity),
	// 	db.Station.NumVehiclesAvailable.Set(numVehiclesAvailable),
	// 	db.Station.NumDocksAvailable.Set(numDocksAvailable),
	// 	db.Station.IsRenting.Set(isRenting),
	// 	db.Station.IsReturning.Set(isReturning),
	// 	db.Station.LastReported.Set(lastReportedTime),
	// 	db.Station.VehicleTypesAvailable.Set(vehicleTypesAvailableBytes),
	// 	db.Station.RawData.Set(rawDataBytes),
	// 	db.Station.Network.Link(db.Network.ID.Equals(networkId)),
	// ).Update(
	// 	db.Station.Name.Set(name),
	// 	db.Station.Address.Set(address),
	// 	db.Station.Capacity.Set(capacity),
	// 	db.Station.NumVehiclesAvailable.Set(numVehiclesAvailable),
	// 	db.Station.NumDocksAvailable.Set(numDocksAvailable),
	// 	db.Station.IsRenting.Set(isRenting),
	// 	db.Station.IsReturning.Set(isReturning),
	// 	db.Station.LastReported.Set(lastReportedTime),
	// 	db.Station.VehicleTypesAvailable.Set(vehicleTypesAvailableBytes),
	// 	db.Station.RawData.Set(rawDataBytes),
	// ).Exec(ctx)

	if err != nil {
		log.Printf("failed to upsert station record: %v", err)
	} else {
		// log.Printf("Upserted station: %s (ID: %s)", name, upserted["id"])
	}

	// existingRecord, err := dbClient.Station.FindUnique(db.Station.ID.Equals(stationId)).Exec(ctx)
	// if err != nil {
	// 	log.Printf("Failed to find existing station record: %v", err)
	// }

	// // If the record exists, update it
	// if existingRecord != nil {
	// 	// iterate over the station map and set fields
	// 	for key, value := range station {
	// 		// Skip the id field, as it should not be updated
	// 		if key == "id" {
	// 			continue
	// 		}

	// 		// Set the field value in the existing record
	// 		// existingRecord.Set(key, value)
	// 		existingRecord[key].Set(value)
	// 	}
	// 	updatedRecord, err := dbClient.Station.UpdateOne(
	// 		db.Station.ID.Equals(stationId),

	// 	)

	// 	// Save the updated record
	// 	err = app.Save(existingRecord)
	// 	if err != nil {
	// 		return fmt.Errorf("failed to update station record: %v", err)
	// 	}
	// } else {
	// 	// If the record doesn't exist, create a new one
	// 	collection, err := app.FindCollectionByNameOrId("bs_stations")
	// 	if err != nil {
	// 		return fmt.Errorf("failed to find collection 'bs_stations': %v", err)
	// 	}

	// 	// Create a new record
	// 	newRecord := core.NewRecord(collection)
	// 	for key, value := range station {
	// 		newRecord.Set(key, value)
	// 	}

	// 	// Save the new record
	// 	err = app.Save(newRecord)
	// 	if err != nil {
	// 		// print record data for debugging
	// 		prettyJSON, _ := json.MarshalIndent(station, "", "  ")
	// 		log.Printf("Failed to create station record: %v\nRecord data: %s", err, prettyJSON)
	// 		return fmt.Errorf("failed to create station record: %v", err)
	// 	}
	// }

	return nil
}

// parseTimestampFlexible tries to parse various timestamp formats, handling trailing Z after offset
func parseTimestampFlexible(ts string) *time.Time {
	// Remove trailing 'Z' if there is already a timezone offset
	if strings.HasSuffix(ts, "Z") && (strings.Contains(ts, "+") || strings.Contains(ts, "-")) {
		ts = strings.TrimSuffix(ts, "Z")
	}

	// Try layouts: with microseconds, with/without offset, with/without Z
	layouts := []string{
		"2006-01-02T15:04:05.999999-07:00",
		"2006-01-02T15:04:05.999999Z07:00",
		"2006-01-02T15:04:05.999999Z",
		"2006-01-02T15:04:05-07:00",
		"2006-01-02T15:04:05Z07:00",
		"2006-01-02T15:04:05Z",
	}
	for _, layout := range layouts {
		if t, err := time.Parse(layout, ts); err == nil {
			return &t
		}
	}
	// Log warning if all fail
	log.Printf("⚠️ Warning: failed to parse timestamp '%s'", ts)
	return nil
}
