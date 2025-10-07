package supabase

import (
	"encoding/json"
	"fmt"
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

	log.Printf("✅ Successfully upserted station: %s (%s)", station.Name, station.ID)
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

	log.Printf("🔍 DEBUG: Attempting to batch upsert %d stations", len(stationsData))

	// Log first station's keys to see structure
	// if len(stationsData) > 0 {
	// 	keys := make([]string, 0, len(stationsData[0]))
	// 	for k := range stationsData[0] {
	// 		keys = append(keys, k)
	// 	}
	// 	log.Printf("🔍 DEBUG: First station keys: %v", keys)
	// }

	// Convert all station data to StationRecords
	stations := make([]stationMapper.StationRecord, 0, len(stationsData))
	for i, stationData := range stationsData {
		jsonData, err := json.Marshal(stationData)
		if err != nil {
			log.Printf("Warning: failed to marshal station data at index %d: %v", i, err)
			continue
		}

		var station stationMapper.StationRecord
		if err := json.Unmarshal(jsonData, &station); err != nil {
			log.Printf("Warning: failed to unmarshal station data at index %d: %v", i, err)
			continue
		}

		stations = append(stations, station)
	}

	if len(stations) == 0 {
		return fmt.Errorf("no valid stations to upsert")
	}

	log.Printf("🔍 DEBUG: Successfully converted %d stations to StationRecord structs", len(stations))

	// // Log the first station to see what's being sent
	// if len(stations) > 0 {
	// 	firstStationJSON, _ := json.MarshalIndent(stations[0], "", "  ")
	// 	log.Printf("🔍 DEBUG: First station JSON:\n%s", string(firstStationJSON))
	// }

	// Batch upsert to station table
	_, _, err := Config.Client.From("station").
		Upsert(stations, "id", "*", "merge-duplicates").
		Execute()

	if err != nil {
		log.Printf("❌ DEBUG: Batch upsert failed for %d stations", len(stations))
		// Log all station IDs in the failed batch
		ids := make([]string, 0, len(stations))
		for _, s := range stations {
			ids = append(ids, s.ID)
		}
		log.Printf("❌ DEBUG: Failed station IDs: %v", ids)

		// // Log the full payload for the first few stations
		// if len(stations) <= 3 {
		// 	allStationsJSON, _ := json.MarshalIndent(stations, "", "  ")
		// 	log.Printf("❌ DEBUG: Full batch payload:\n%s", string(allStationsJSON))
		// }

		return fmt.Errorf("failed to batch upsert %d stations: %v", len(stations), err)
	}

	log.Printf("✅ Successfully batch upserted %d stations", len(stations))
	return nil
}
