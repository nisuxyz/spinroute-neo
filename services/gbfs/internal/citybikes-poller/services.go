package citybikespoller

import (
	"compress/gzip"
	"encoding/json"
	"fmt"
	stationMapper "gbfs-service/internal/station-mapper"
	supabaseClient "gbfs-service/internal/supabase"
	vehicleMapper "gbfs-service/internal/vehicle-mapper"
	"io"
	"log"
	"net/http"
	"strings"
	"time"
)

// CityBikesNetworkResponse represents the API response
type CityBikesNetworkResponse struct {
	Network struct {
		ID       string                   `json:"id"`
		Stations []map[string]any         `json:"stations"`
		Vehicles []map[string]any         `json:"vehicles"`
	} `json:"network"`
}

// fetchNetwork fetches station and vehicle data for a network
func fetchNetwork(networkID string) (*CityBikesNetworkResponse, error) {
	url := fmt.Sprintf("https://api.citybik.es/v2/networks/%s?fields=id,stations,vehicles", networkID)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %v", err)
	}

	// Set headers to mimic browser request (required for rate limiting)
	req.Header.Set("User-Agent", Config.UserAgent)
	req.Header.Set("Accept", "*/*")
	req.Header.Set("Accept-Language", "en-US,en;q=0.5")
	req.Header.Set("Accept-Encoding", "gzip, deflate, br")
	req.Header.Set("Origin", Config.Origin)
	req.Header.Set("Referer", Config.Referer)
	req.Header.Set("Sec-Fetch-Dest", "empty")
	req.Header.Set("Sec-Fetch-Mode", "cors")
	req.Header.Set("Sec-Fetch-Site", "same-site")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP %d error", resp.StatusCode)
	}

	// Handle gzip-compressed responses
	var reader io.Reader = resp.Body
	if strings.Contains(resp.Header.Get("Content-Encoding"), "gzip") {
		gzReader, err := gzip.NewReader(resp.Body)
		if err != nil {
			return nil, fmt.Errorf("failed to create gzip reader: %v", err)
		}
		defer gzReader.Close()
		reader = gzReader
	}

	body, err := io.ReadAll(reader)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %v", err)
	}

	var result CityBikesNetworkResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to parse JSON: %v", err)
	}

	return &result, nil
}

// processNetworkData processes and upserts station and vehicle data
func processNetworkData(networkID string, data *CityBikesNetworkResponse) error {
	log.Printf("📊 Processing %s: %d stations, %d vehicles",
		networkID, len(data.Network.Stations), len(data.Network.Vehicles))

	// Process stations
	if len(data.Network.Stations) > 0 {
		stations := make([]map[string]any, 0, len(data.Network.Stations))
		for _, stationData := range data.Network.Stations {
			mapped, err := stationMapper.MapStationData(stationData, networkID)
			if err != nil {
				log.Printf("⚠️  Failed to map station: %v", err)
				continue
			}
			stations = append(stations, mapped)
		}

		if len(stations) > 0 {
			if err := supabaseClient.BatchUpsertStations(stations); err != nil {
				log.Printf("❌ Failed to upsert stations for %s: %v", networkID, err)
			} else {
				log.Printf("✅ Upserted %d stations for %s", len(stations), networkID)
			}
		}
	}

	// Process vehicles
	if len(data.Network.Vehicles) > 0 {
		vehicles := make([]map[string]any, 0, len(data.Network.Vehicles))
		for _, vehicleData := range data.Network.Vehicles {
			mapped, err := vehicleMapper.MapVehicleData(vehicleData, networkID)
			if err != nil {
				log.Printf("⚠️  Failed to map vehicle: %v", err)
				continue
			}
			vehicles = append(vehicles, mapped)
		}

		if len(vehicles) > 0 {
			if err := supabaseClient.BatchUpsertVehicles(vehicles); err != nil {
				log.Printf("❌ Failed to upsert vehicles for %s: %v", networkID, err)
			} else {
				log.Printf("🛴 Upserted %d vehicles for %s", len(vehicles), networkID)
			}
		}
	}

	return nil
}

// pollNetwork fetches and processes data for a single network
func pollNetwork(networkID string) {
	log.Printf("🔄 Polling network: %s", networkID)

	data, err := fetchNetwork(networkID)
	if err != nil {
		log.Printf("❌ Failed to fetch %s: %v", networkID, err)
		return
	}

	if err := processNetworkData(networkID, data); err != nil {
		log.Printf("❌ Failed to process %s: %v", networkID, err)
	}
}

// StartPoller starts the polling loop for all configured networks
func StartPoller() {
	if len(Config.NetworkIDs) == 0 {
		log.Println("⚠️  No networks configured for polling")
		return
	}

	log.Printf("🚀 Starting CityBikes poller")
	log.Printf("   Networks: %v", Config.NetworkIDs)
	log.Printf("   Rate limit: %d requests/hour", Config.RequestsPerHour)
	log.Printf("   Polling interval: %v", Config.PollingInterval)

	// Initial poll for all networks
	for _, networkID := range Config.NetworkIDs {
		pollNetwork(networkID)
		// Small delay between initial requests
		time.Sleep(2 * time.Second)
	}

	// Start polling loop
	ticker := time.NewTicker(Config.PollingInterval)
	defer ticker.Stop()

	networkIndex := 0
	for range ticker.C {
		// Round-robin through networks
		networkID := Config.NetworkIDs[networkIndex]
		pollNetwork(networkID)

		networkIndex = (networkIndex + 1) % len(Config.NetworkIDs)
	}
}
