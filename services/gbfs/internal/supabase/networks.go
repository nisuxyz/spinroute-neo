package supabase

import (
	"encoding/json"
	"fmt"
	"gbfs-service/internal/uuidfy"
	"log"
	"net/http"
	"strings"
	"time"
)

// NetworkRecord represents a bikeshare network record for Supabase
// Note: We don't use omitempty because PostgREST requires all keys to match in batch upserts
type NetworkRecord struct {
	ID                    string         `json:"id"`
	Name                  string         `json:"name"`
	Company               *string        `json:"company"`
	Location              *string        `json:"location"`
	City                  *string        `json:"city"`
	Country               *string        `json:"country"`
	StationStatusURL      *string        `json:"station_status_url"`
	StationInformationURL *string        `json:"station_information_url"`
	VehicleStatusURL      *string        `json:"vehicle_status_url"`
	RawData               map[string]any `json:"raw_data"`
}

// APISource represents an API source record from Supabase
type APISource struct {
	Name         string `json:"name"`
	DiscoveryURL string `json:"discovery_url"`
	IsGBFS       bool   `json:"is_gbfs"`
	Active       bool   `json:"active"`
}

// BootstrapNetworks fetches and syncs all networks from API sources at startup
func BootstrapNetworks() error {
	log.Println("🌐 Bootstrapping networks from API sources...")

	if Config == nil || Config.Client == nil {
		return fmt.Errorf("supabase client not initialized")
	}

	// 1. Fetch all active API sources
	data, _, err := Config.Client.From("api_source").
		Select("*", "exact", false).
		Eq("active", "true").
		Execute()
	if err != nil {
		return fmt.Errorf("failed to fetch API sources: %v", err)
	}

	var apiSources []APISource
	if err := json.Unmarshal(data, &apiSources); err != nil {
		return fmt.Errorf("failed to parse API sources: %v", err)
	}

	if len(apiSources) == 0 {
		log.Println("⚠️  No active API sources found for networks")
		return nil
	}

	log.Printf("📡 Found %d active API source(s)", len(apiSources))

	// 2. Process each API source
	totalNetworks := 0
	for _, source := range apiSources {
		if source.IsGBFS {
			log.Printf("⏭️  Skipping GBFS source: %s (GBFS discovery not yet implemented)", source.Name)
			continue
		}

		log.Printf("📥 Fetching networks from: %s (%s)", source.Name, source.DiscoveryURL)

		networks, err := fetchNetworksFromSource(source.DiscoveryURL)
		if err != nil {
			log.Printf("⚠️  Failed to fetch networks from %s: %v", source.Name, err)
			continue
		}

		log.Printf("📊 Found %d networks in %s", len(networks), source.Name)

		// 3. Upsert networks in batches
		if err := upsertNetworks(networks); err != nil {
			log.Printf("⚠️  Failed to upsert networks from %s: %v", source.Name, err)
			continue
		}

		totalNetworks += len(networks)
	}

	log.Printf("✅ Network bootstrap complete! Synced %d networks", totalNetworks)
	return nil
}

// fetchNetworksFromSource fetches network data from a discovery URL
func fetchNetworksFromSource(discoveryURL string) ([]NetworkRecord, error) {
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	resp, err := client.Get(discoveryURL)
	if err != nil {
		return nil, fmt.Errorf("HTTP request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP %d error", resp.StatusCode)
	}

	var data map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, fmt.Errorf("failed to decode JSON: %v", err)
	}

	networksData, ok := data["networks"]
	if !ok {
		return nil, fmt.Errorf("no 'networks' field in response")
	}

	networksArray, ok := networksData.([]any)
	if !ok {
		return nil, fmt.Errorf("'networks' field is not an array")
	}

	var networks []NetworkRecord
	for _, networkData := range networksArray {
		network, ok := networkData.(map[string]any)
		if !ok {
			continue
		}

		record, err := mapNetworkToRecord(network)
		if err != nil {
			log.Printf("⚠️  Skipping network: %v", err)
			continue
		}

		networks = append(networks, record)
	}

	return networks, nil
}

// mapNetworkToRecord converts raw network data to a NetworkRecord
func mapNetworkToRecord(network map[string]any) (NetworkRecord, error) {
	// Extract required fields
	networkID, hasID := network["id"].(string)
	networkName, hasName := network["name"].(string)
	location, hasLocation := network["location"].(map[string]any)

	if !hasID || !hasName {
		return NetworkRecord{}, fmt.Errorf("missing required fields (id or name)")
	}

	// Generate UUID for network
	recordID, err := uuidfy.UUIDfy(networkID)
	if err != nil {
		return NetworkRecord{}, fmt.Errorf("failed to generate UUID for %s: %v", networkID, err)
	}

	// Helper to create string pointers
	strPtr := func(s string) *string {
		return &s
	}

	record := NetworkRecord{
		ID:                    recordID,
		Name:                  networkName,
		StationStatusURL:      strPtr(fmt.Sprintf("https://api.citybik.es/gbfs/3/%s/station_status.json", networkID)),
		StationInformationURL: strPtr(fmt.Sprintf("https://api.citybik.es/gbfs/3/%s/station_information.json", networkID)),
		VehicleStatusURL:      strPtr(fmt.Sprintf("https://api.citybik.es/gbfs/3/%s/vehicle_status.json", networkID)),
		RawData:               network,
	}

	// Extract location data
	if hasLocation {
		latitude, _ := location["latitude"].(float64)
		longitude, _ := location["longitude"].(float64)
		city, _ := location["city"].(string)
		country, _ := location["country"].(string)

		record.Location = strPtr(fmt.Sprintf("POINT(%f %f)", longitude, latitude))
		record.City = strPtr(city)
		record.Country = strPtr(country)
	}

	// Extract company data
	if companies, ok := network["company"].([]any); ok {
		var companyNames []string
		for _, comp := range companies {
			if compName, ok := comp.(string); ok {
				companyNames = append(companyNames, compName)
			}
		}
		record.Company = strPtr(strings.Join(companyNames, ", "))
	}

	return record, nil
}

// upsertNetworks batch upserts network records to Supabase
func upsertNetworks(networks []NetworkRecord) error {
	if len(networks) == 0 {
		return nil
	}

	// Batch upsert in chunks of 100
	batchSize := 100
	for i := 0; i < len(networks); i += batchSize {
		end := i + batchSize
		if end > len(networks) {
			end = len(networks)
		}

		batch := networks[i:end]
		_, _, err := Config.Client.From("network").
			Upsert(batch, "id", "*", "merge-duplicates").
			Execute()

		if err != nil {
			return fmt.Errorf("failed to upsert batch %d-%d: %v", i, end, err)
		}

		log.Printf("  📤 Upserted networks %d-%d of %d", i+1, end, len(networks))
	}

	return nil
}
