package supabase

import (
	"encoding/json"
	"fmt"
	"gbfs-service/internal/envkeys"
	stationMapper "gbfs-service/internal/station-mapper"
	"log"
)

// UpsertStation inserts or updates a station record in Supabase
func UpsertStation(stationData map[string]any) error {
	if Config == nil || Config.Client == nil {
		return fmt.Errorf("supabase client not initialized")
	}

	// Convert the map to StationRecord
	jsonData, err := json.Marshal(stationData)
	if err != nil {
		return fmt.Errorf("failed to marshal station data: %v", err)
	}

	var station stationMapper.StationRecord
	if err := json.Unmarshal(jsonData, &station); err != nil {
		return fmt.Errorf("failed to unmarshal station data: %v", err)
	}

	// Upsert the station using Supabase's upsert functionality
	// This will insert if the record doesn't exist, or update if it does
	// Note: Using bikeshare.station table
	_, _, err = Config.Client.From("station").
		Upsert(station, "id", "*", "merge-duplicates").
		Execute()

	if err != nil {
		return fmt.Errorf("failed to upsert station %s: %v", station.ID, err)
	}

	if envkeys.Environment.Verbose {
		log.Printf("✅ Successfully upserted station: %s (%s)", station.Name, station.ID)
	}
	return nil
}

// BatchUpsertStations upserts multiple stations in a single request
func BatchUpsertStations(stationsData []map[string]any) error {
	if Config == nil || Config.Client == nil {
		return fmt.Errorf("supabase client not initialized")
	}

	if len(stationsData) == 0 {
		return nil
	}

	verbose := envkeys.Environment.Verbose

	if verbose {
		// Extended logging: Log unique network_ids in this batch
		networkIDs := make(map[string]bool)
		for _, stationData := range stationsData {
			if networkID, ok := stationData["network_id"].(string); ok {
				networkIDs[networkID] = true
			}
		}
		networkIDList := make([]string, 0, len(networkIDs))
		for id := range networkIDs {
			networkIDList = append(networkIDList, id)
		}
		log.Printf("🔍 DEBUG: Unique network_ids in batch: %v", networkIDList)
	}

	// Convert all station data to StationRecords
	stations := make([]stationMapper.StationRecord, 0, len(stationsData))
	for i, stationData := range stationsData {
		jsonData, err := json.Marshal(stationData)
		if err != nil {
			if verbose {
				log.Printf("Warning: failed to marshal station data at index %d: %v", i, err)
			}
			continue
		}

		var station stationMapper.StationRecord
		if err := json.Unmarshal(jsonData, &station); err != nil {
			if verbose {
				log.Printf("Warning: failed to unmarshal station data at index %d: %v", i, err)
			}
			continue
		}

		stations = append(stations, station)
	}

	if len(stations) == 0 {
		return fmt.Errorf("no valid stations to upsert")
	}

	// Batch upsert to station table
	_, _, err := Config.Client.From("station").
		Upsert(stations, "id", "*", "merge-duplicates").
		Execute()

	if err != nil {
		// Always log errors
		log.Printf("❌ Batch upsert failed for %d stations: %v", len(stations), err)
		
		if verbose {
			// Log all unique network_ids in the failed batch
			failedNetworkIDs := make(map[string]int)
			for _, s := range stations {
				failedNetworkIDs[s.NetworkID]++
			}
			log.Printf("❌ DEBUG: Failed batch network_ids (with station counts): %v", failedNetworkIDs)
			
			// Log all station IDs in the failed batch
			ids := make([]string, 0, len(stations))
			for _, s := range stations {
				ids = append(ids, s.ID)
			}
			log.Printf("❌ DEBUG: Failed station IDs: %v", ids)
		}

		return fmt.Errorf("failed to batch upsert %d stations: %v", len(stations), err)
	}

	log.Printf("✅ Batch upserted %d stations", len(stations))
	return nil
}
