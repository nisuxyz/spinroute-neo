package stationMapper

import (
	"fmt"
	"gbfs-service/internal/uuidfy"
	"log"
	"time"
)

// old station record
// // StationRecord represents a bike station in Supabase bikeshare.station table
// type StationRecord struct {
// 	ID                    string                 `json:"id"`                      // UUID (stored as 15-char string from uuidfy)
// 	NetworkID             string                 `json:"network_id"`              // UUID, references bikeshare.network
// 	Name                  string                 `json:"name"`                    // NOT NULL
// 	Location              string                 `json:"location"`                // gis.geography as WKT: "POINT(lon lat)"
// 	NumVehiclesAvailable  int                    `json:"num_vehicles_available"`  // NOT NULL
// 	NumDocksAvailable     int                    `json:"num_docks_available"`     // NOT NULL
// 	Capacity              int                    `json:"capacity"`                // NOT NULL
// 	Address               *string                `json:"address"`                 // nullable - must be included even if nil
// 	IsRenting             *bool                  `json:"is_renting"`              // nullable - must be included even if nil
// 	IsReturning           *bool                  `json:"is_returning"`            // nullable - must be included even if nil
// 	LastReported          string                 `json:"last_reported"`           // timestamptz NOT NULL
// 	VehicleTypesAvailable map[string]interface{} `json:"vehicle_types_available"` // jsonb NOT NULL
// 	RawData               map[string]interface{} `json:"raw_data"`                // jsonb NOT NULL
// 	FetchedAt             *string                `json:"fetched_at,omitempty"`    // timestamptz, auto-populated
// 	CreatedAt             *string                `json:"created_at,omitempty"`    // timestamptz, auto-populated
// }

// new station record based on new schema:
// export const bikeshareStation = bikeshareSchema.table("station", {
//   id: uuid().defaultRandom().primaryKey().notNull(),
//   createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`(now() AT TIME ZONE 'utc'::text)`).notNull(),
//   fetchedAt: timestamp("fetched_at", { withTimezone: true, mode: 'string' }).default(sql`(now() AT TIME ZONE 'utc'::text)`).notNull(),
//   networkId: uuid("network_id")
//     .references(() => bikeshareNetwork.id, { onDelete: "cascade" })
//     .notNull(),
//   name: text().notNull(),
//   location: geographyPointColumnType("location").notNull(),
//   address: text(),
//   capacity: integer("capacity").notNull(),
//   numVehiclesAvailable: integer("num_vehicles_available").notNull(),
//   numDocksAvailable: integer("num_docks_available").notNull(),
//   numEbikesAvailable: integer("num_ebikes_available").notNull(),
//   numRegularBikesAvailable: integer("num_regular_bikes_available").notNull(),
//   isOperational: boolean("is_operational").notNull(), // can you use the station (e.g. not closed for maintenance)
//   isRenting: boolean("is_renting"), // can you rent vehicles from the station
//   isReturning: boolean("is_returning"), // can you return vehicles to the station
//   isVirtual: boolean("is_virtual"), // virtual/floating station?
//   lastReported: timestamp("last_reported", { withTimezone: true, mode: 'string' }).notNull(),
//   // vehicleTypesAvailable: jsonb("vehicle_types_available").notNull(),
//   // e.g. {"ebike": 3, "classic_bike": 5}
//   rawData: jsonb("raw_data").notNull()
// }, (table) => [
//   index("station_network_id_index").on(table.networkId),
//   index("station_location_index").on(table.location)
// ]);

type StationRecord struct {
	ID                 string  `json:"id"`                   // UUID (stored as 15-char string from uuidfy)
	CreatedAt          *string `json:"created_at,omitempty"` // timestamptz, auto-populated
	FetchedAt          *string `json:"fetched_at,omitempty"` // timestamptz, auto-populated
	NetworkID          string  `json:"network_id"`           // UUID, references bikeshare.network
	Name               string  `json:"name"`                 // NOT NULL
	Location           string  `json:"location"`             // gis.geography as WKT: "POINT(lon lat)"
	Address            *string `json:"address"`              // nullable - must be included even if nil
	Capacity           int     `json:"capacity"`             // NOT NULL
	NumDocksAvailable  int     `json:"num_docks_available"`  // NOT NULL
	NumEbikesAvailable int     `json:"num_ebikes_available"` // NOT NULL
	NumBikesAvailable  int     `json:"num_bikes_available"`  // NOT NULL
	IsOperational      bool    `json:"is_operational"`       // NOT NULL, can you use the station (e.g. not closed for maintenance)
	IsRenting          *bool   `json:"is_renting"`           // nullable - must be included even if nil
	IsReturning        *bool   `json:"is_returning"`         // nullable - must be included even if nil
	IsVirtual          *bool   `json:"is_virtual"`           // nullable - must be included even if nil, virtual/floating station?
	LastReported       string  `json:"last_reported"`        // timestamptz NOT NULL
	// VehicleTypesAvailable     map[string]interface{} `json:"vehicle_types_available"`     // jsonb NOT NULL
	RawData map[string]interface{} `json:"raw_data"` // jsonb NOT NULL
}

// extractLastReported parses the timestamp from station data and formats it as RFC3339
// Returns current time if timestamp is missing or invalid
func extractLastReported(stationData map[string]any) string {
	timestamp, _ := stationData["timestamp"].(string)

	if timestamp != "" {
		if parsed, err := time.Parse(time.RFC3339, timestamp); err == nil {
			return parsed.Format(time.RFC3339)
		}
	}

	// If parsing fails or no timestamp provided, use current time
	return time.Now().Format(time.RFC3339)
}

// extractAddress retrieves the optional address field from extra data
func extractAddress(extra map[string]any) *string {
	if extra == nil {
		return nil
	}

	if addr, ok := extra["address"].(string); ok && addr != "" {
		return &addr
	}

	return nil
}

// extractLocation formats latitude and longitude as PostGIS geography WKT format
func extractLocation(stationData map[string]any) string {
	latitude, _ := stationData["latitude"].(float64)
	longitude, _ := stationData["longitude"].(float64)
	return fmt.Sprintf("POINT(%f %f)", longitude, latitude)
}

// extractIsOperational determines if the station is operational
// A station is operational if it has capacity and is not explicitly marked as non-operational
func extractIsOperational(capacity int, freeBikes float64, extra map[string]any) bool {
	// If there's no capacity, it's not operational
	if capacity == 0 {
		return false
	}

	// Check explicit operational status in extra data
	if extra != nil {
		// Check for explicit operational field
		if operational, ok := extra["operational"].(bool); ok {
			return operational
		}
		// Handle numeric boolean
		if operational, ok := extra["operational"].(float64); ok {
			return operational != 0
		}

		// Check for online field
		if online, ok := extra["online"].(bool); ok {
			return online
		}
		// Handle numeric boolean
		if online, ok := extra["online"].(float64); ok {
			return online != 0
		}

		// Check status field
		if status, ok := extra["status"].(string); ok {
			if status == "closed" || status == "offline" {
				return false
			}
		}
	}

	// Infer from bike availability - if station has capacity but no bikes and no docks available,
	// it might be operational but empty, so check if it's truly usable
	// A station is operational if it has capacity and at least some bikes or docks available
	return capacity > 0 && freeBikes >= 0
}

// extractIsRenting retrieves the renting status from extra data
// Returns nil if not explicitly set, allowing database default
// Infers from operational status and bike availability if not explicit
func extractIsRenting(extra map[string]any, isOperational bool, freeBikes float64) *bool {
	// If not operational, explicitly set to false
	if !isOperational {
		falseVal := false
		return &falseVal
	}

	if extra != nil {
		// Check for explicit renting field
		if renting, ok := extra["renting"].(bool); ok {
			return &renting
		}

		// Handle numeric boolean (1/0)
		if renting, ok := extra["renting"].(float64); ok {
			val := renting != 0
			return &val
		}

		// Check for status field that might indicate renting capability
		if status, ok := extra["status"].(string); ok {
			if status == "closed" || status == "offline" || status == "maintenance" {
				falseVal := false
				return &falseVal
			}
			if status == "open" || status == "active" {
				trueVal := true
				return &trueVal
			}
		}

		// Check for online field as an indicator
		if online, ok := extra["online"].(bool); ok {
			if !online {
				falseVal := false
				return &falseVal
			}
		}
		if online, ok := extra["online"].(float64); ok {
			if online == 0 {
				falseVal := false
				return &falseVal
			}
		}
	}

	// Infer from bike availability: if operational and has bikes, likely allows renting
	if isOperational && freeBikes > 0 {
		trueVal := true
		return &trueVal
	}

	if isOperational && freeBikes == 0 {
		falseVal := false
		return &falseVal
	}

	// If operational but no bikes, we can't definitively say - return nil for database default
	if isOperational {
		return nil
	}

	falseVal := false
	return &falseVal
}

// extractIsReturning retrieves the returning status from extra data
// Returns nil if not explicitly set, allowing database default
// Infers from operational status and dock availability if not explicit
func extractIsReturning(extra map[string]any, isOperational bool, emptySlots float64, isVirtual *bool) *bool {
	// If not operational, explicitly set to false
	if !isOperational {
		falseVal := false
		return &falseVal
	}

	if extra != nil {
		// Check for explicit returning field
		if returning, ok := extra["returning"].(bool); ok {
			return &returning
		}

		// Handle numeric boolean (1/0)
		if returning, ok := extra["returning"].(float64); ok {
			val := returning != 0
			return &val
		}

		// Check for status field that might indicate returning capability
		if status, ok := extra["status"].(string); ok {
			if status == "closed" || status == "offline" || status == "maintenance" {
				falseVal := false
				return &falseVal
			}
			if status == "open" || status == "active" {
				trueVal := true
				return &trueVal
			}
		}

		// Check for online field as an indicator
		if online, ok := extra["online"].(bool); ok {
			if !online {
				falseVal := false
				return &falseVal
			}
		}
		if online, ok := extra["online"].(float64); ok {
			if online == 0 {
				falseVal := false
				return &falseVal
			}
		}
	}

	// Virtual stations typically allow returns
	if isVirtual != nil && *isVirtual && isOperational {
		trueVal := true
		return &trueVal
	}

	// Infer from dock availability: if operational and has empty slots, likely allows returning
	if isOperational && emptySlots > 0 {
		trueVal := true
		return &trueVal
	}

	// If operational but no empty slots, we can't definitively say - return nil for database default
	if isOperational {
		return nil
	}

	falseVal := false
	return &falseVal
}

// extractIsVirtual determines if the station is virtual/floating
func extractIsVirtual(extra map[string]any) *bool {
	if extra == nil {
		return nil
	}

	// Check for explicit virtual field
	if virtual, ok := extra["virtual"].(bool); ok {
		return &virtual
	}

	// Handle numeric boolean
	if virtual, ok := extra["virtual"].(float64); ok {
		val := virtual != 0
		return &val
	}

	// Check alternative field names
	if uid, ok := extra["uid"].(string); ok && uid == "virtual" {
		trueVal := true
		return &trueVal
	}

	falseVal := false
	return &falseVal
}

// extractCapacity calculates station capacity from available data
// For virtual stations (null empty_slots), uses slots from extra or just free bikes
func extractCapacity(freeBikes, emptySlots float64, extra map[string]any, isVirtual *bool) int {
	// Check if this is a virtual station with null empty_slots
	virtualStation := isVirtual != nil && *isVirtual

	// For virtual stations, emptySlots might be intentionally 0/null
	if virtualStation {
		// Try to get from extra.slots first
		if extra != nil {
			if slots, ok := extra["slots"].(float64); ok && slots > 0 {
				return int(slots)
			}
		}
		// For virtual stations, capacity equals free bikes
		if freeBikes > 0 {
			return int(freeBikes)
		}
		return 0
	}

	// For regular stations, calculate from available data
	if emptySlots >= 0 && freeBikes >= 0 {
		return int(emptySlots + freeBikes)
	}

	// Try to get from extra.slots
	if extra != nil {
		if slots, ok := extra["slots"].(float64); ok && slots > 0 {
			return int(slots)
		}
	}

	// If still 0, set to at least the number of available bikes
	if freeBikes > 0 {
		return int(freeBikes)
	}

	return 0
}

// extractNumEbikesAvailable counts the number of available e-bikes
func extractNumEbikesAvailable(extra map[string]any) int {
	if extra == nil {
		return 0
	}

	if ebikes, ok := extra["ebikes"].(float64); ok && ebikes >= 0 {
		return int(ebikes)
	}

	return 0
}

// extractNumRegularBikesAvailable counts the number of available regular bikes
func extractNumRegularBikesAvailable(freeBikes float64, extra map[string]any) int {
	// Start with total free bikes
	totalBikes := int(freeBikes)

	if extra == nil {
		// No extra data, all bikes are regular bikes
		return totalBikes
	}

	// If we have explicit normal_bikes count, use it
	if normalBikes, ok := extra["normal_bikes"].(float64); ok && normalBikes >= 0 {
		return int(normalBikes)
	}

	// Otherwise, calculate as total bikes minus e-bikes
	numEbikes := extractNumEbikesAvailable(extra)
	regularBikes := totalBikes - numEbikes

	// Ensure we don't return negative values
	if regularBikes < 0 {
		return 0
	}

	return regularBikes
}

// MapStationData transforms WebSocket station data to Supabase bikeshare.station format
func MapStationData(stationData map[string]any, networkName string) (map[string]any, error) {
	// Generate station ID using uuidfy (converts to 15-char string that will be used as UUID)
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
	freeBikes, _ := stationData["free_bikes"].(float64)
	emptySlots, _ := stationData["empty_slots"].(float64)

	// Extract extra data
	extra, _ := stationData["extra"].(map[string]any)

	// Extract virtual status first as it affects capacity calculation
	isVirtual := extractIsVirtual(extra)

	// Use helper functions to extract processed fields
	location := extractLocation(stationData)
	lastReported := extractLastReported(stationData)
	address := extractAddress(extra)

	// Calculate capacity (depends on isVirtual)
	capacity := extractCapacity(freeBikes, emptySlots, extra, isVirtual)

	// Determine operational status (depends on capacity)
	isOperational := extractIsOperational(capacity, freeBikes, extra)

	// Extract renting/returning status (depends on isOperational)
	isRenting := extractIsRenting(extra, isOperational, freeBikes)
	isReturning := extractIsReturning(extra, isOperational, emptySlots, isVirtual)

	numEbikesAvailable := extractNumEbikesAvailable(extra)
	numRegularBikesAvailable := extractNumRegularBikesAvailable(freeBikes, extra)

	// Ensure num_docks_available has a value - REQUIRED field (NOT NULL)
	// For virtual stations, this might be 0
	numDocksAvailable := 0
	if emptySlots >= 0 {
		numDocksAvailable = int(emptySlots)
	}

	// Build the mapped station record for Supabase bikeshare.station table
	// Using gis.geography format for location (PostGIS WKT)
	// IMPORTANT: All fields must be present for batch upsert (PostgREST requirement)
	// Nullable fields should be set to nil, not omitted
	mappedStation := map[string]any{
		"id":                   mappedStationId,
		"network_id":           networkId,
		"name":                 name,
		"location":             location,
		"address":              address,
		"capacity":             capacity,
		"num_docks_available":  numDocksAvailable,
		"num_ebikes_available": numEbikesAvailable,
		"num_bikes_available":  numRegularBikesAvailable,
		"is_operational":       isOperational,
		"is_renting":           isRenting,
		"is_returning":         isReturning,
		"is_virtual":           isVirtual,
		"last_reported":        lastReported,
		"raw_data":             stationData,
	}

	// Debug logging to see what's being created
	if Config.verbose {
		log.Printf("🔍 DEBUG: Mapped station keys: %v", getKeys(mappedStation))
		log.Printf("🔍 DEBUG: Station %s - virtual: %v, capacity: %d, operational: %v, renting: %v, returning: %v",
			mappedStationId, isVirtual, capacity, isOperational, isRenting, isReturning)
	}

	return mappedStation, nil
}

// Helper function to get map keys
func getKeys(m map[string]any) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}
