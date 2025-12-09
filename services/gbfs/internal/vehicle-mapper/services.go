package vehicleMapper

import (
	"fmt"
	"gbfs-service/internal/uuidfy"
	"log"
	"strings"
	"time"
)

// VehicleRecord represents a free-floating vehicle in Supabase bikeshare.vehicle table
type VehicleRecord struct {
	ID            string         `json:"id"`
	NetworkID     string         `json:"network_id"`
	Location      string         `json:"location"`
	VehicleType   *string        `json:"vehicle_type"`
	IsReserved    *bool          `json:"is_reserved"`
	IsDisabled    *bool          `json:"is_disabled"`
	BatteryLevel  *int           `json:"battery_level"`
	LastReported  *string        `json:"last_reported"`
	PricingPlanID *string        `json:"pricing_plan_id"`
	RentalURIs    map[string]any `json:"rental_uris"`
	RawData       map[string]any `json:"raw_data"`
	FetchedAt     *string        `json:"fetched_at,omitempty"`
}

// parseTimestampFlexible tries to parse various timestamp formats
func parseTimestampFlexible(ts string) *time.Time {
	if ts == "" {
		return nil
	}

	// Remove trailing 'Z' if there is already a timezone offset
	if strings.HasSuffix(ts, "Z") && (strings.Contains(ts, "+") || strings.Contains(ts, "-")) {
		ts = strings.TrimSuffix(ts, "Z")
	}

	layouts := []string{
		"2006-01-02T15:04:05.999999-07:00",
		"2006-01-02T15:04:05.999999Z07:00",
		"2006-01-02T15:04:05.999999Z",
		"2006-01-02T15:04:05-07:00",
		"2006-01-02T15:04:05Z07:00",
		"2006-01-02T15:04:05Z",
		time.RFC3339,
		time.RFC3339Nano,
	}

	for _, layout := range layouts {
		if t, err := time.Parse(layout, ts); err == nil {
			return &t
		}
	}

	if Config.verbose {
		log.Printf("⚠️ Warning: failed to parse vehicle timestamp '%s'", ts)
	}
	return nil
}

// extractVehicleType determines the vehicle type from the data
func extractVehicleType(vehicleData map[string]any) *string {
	// Check for "kind" field (used by citybik.es)
	if kind, ok := vehicleData["kind"].(string); ok && kind != "" {
		return &kind
	}

	// Check for explicit vehicle_type field
	if vt, ok := vehicleData["vehicle_type"].(string); ok && vt != "" {
		return &vt
	}

	// Check in extra data
	if extra, ok := vehicleData["extra"].(map[string]any); ok {
		if vt, ok := extra["vehicle_type"].(string); ok && vt != "" {
			return &vt
		}
		if kind, ok := extra["kind"].(string); ok && kind != "" {
			return &kind
		}
		// Check for bike type indicators
		if _, hasEbike := extra["ebike"]; hasEbike {
			vt := "ebike"
			return &vt
		}
		if bikeType, ok := extra["bike_type"].(string); ok && bikeType != "" {
			return &bikeType
		}
	}

	// Default to bike if not specified
	defaultType := "bike"
	return &defaultType
}

// extractBatteryLevel extracts battery level from vehicle data
func extractBatteryLevel(vehicleData map[string]any) *int {
	// Direct battery field
	if battery, ok := vehicleData["battery"].(float64); ok {
		level := int(battery)
		return &level
	}

	// Check extra data
	if extra, ok := vehicleData["extra"].(map[string]any); ok {
		if battery, ok := extra["battery"].(float64); ok {
			level := int(battery)
			return &level
		}
		if batteryLevel, ok := extra["battery_level"].(float64); ok {
			level := int(batteryLevel)
			return &level
		}
		// Some systems use percentage
		if batteryPct, ok := extra["battery_percentage"].(float64); ok {
			level := int(batteryPct)
			return &level
		}
	}

	return nil
}

// extractIsReserved determines if the vehicle is reserved
func extractIsReserved(vehicleData map[string]any) *bool {
	if reserved, ok := vehicleData["is_reserved"].(bool); ok {
		return &reserved
	}

	if extra, ok := vehicleData["extra"].(map[string]any); ok {
		if reserved, ok := extra["is_reserved"].(bool); ok {
			return &reserved
		}
		if reserved, ok := extra["reserved"].(bool); ok {
			return &reserved
		}
	}

	return nil
}

// extractIsDisabled determines if the vehicle is disabled
func extractIsDisabled(vehicleData map[string]any) *bool {
	if disabled, ok := vehicleData["is_disabled"].(bool); ok {
		return &disabled
	}

	if extra, ok := vehicleData["extra"].(map[string]any); ok {
		if disabled, ok := extra["is_disabled"].(bool); ok {
			return &disabled
		}
		if disabled, ok := extra["disabled"].(bool); ok {
			return &disabled
		}
	}

	return nil
}

// extractRentalURIs extracts rental URI information
func extractRentalURIs(vehicleData map[string]any) map[string]any {
	if uris, ok := vehicleData["rental_uris"].(map[string]any); ok {
		return uris
	}

	if extra, ok := vehicleData["extra"].(map[string]any); ok {
		if uris, ok := extra["rental_uris"].(map[string]any); ok {
			return uris
		}
	}

	return nil
}

// MapVehicleData transforms WebSocket vehicle data to Supabase bikeshare.vehicle format
func MapVehicleData(vehicleData map[string]any, networkName string) (map[string]any, error) {
	// Generate vehicle ID using uuidfy
	vehicleID, ok := vehicleData["id"].(string)
	if !ok {
		return nil, fmt.Errorf("vehicle id not found or not a string")
	}

	mappedVehicleID, err := uuidfy.UUIDfy(vehicleID)
	if err != nil {
		return nil, fmt.Errorf("failed to generate vehicle ID: %v", err)
	}

	// Generate network ID using uuidfy
	networkID, err := uuidfy.UUIDfy(networkName)
	if err != nil {
		return nil, fmt.Errorf("failed to generate network ID: %v", err)
	}

	// Extract location
	latitude, hasLat := vehicleData["latitude"].(float64)
	longitude, hasLon := vehicleData["longitude"].(float64)
	if !hasLat || !hasLon {
		return nil, fmt.Errorf("vehicle location not found")
	}
	location := fmt.Sprintf("POINT(%f %f)", longitude, latitude)

	// Extract timestamp
	var lastReported *string
	if timestamp, ok := vehicleData["timestamp"].(string); ok && timestamp != "" {
		parsed := parseTimestampFlexible(timestamp)
		if parsed != nil {
			formatted := parsed.Format(time.RFC3339)
			lastReported = &formatted
		}
	}

	// Extract other fields
	vehicleType := extractVehicleType(vehicleData)
	batteryLevel := extractBatteryLevel(vehicleData)
	isReserved := extractIsReserved(vehicleData)
	isDisabled := extractIsDisabled(vehicleData)
	rentalURIs := extractRentalURIs(vehicleData)

	// Extract pricing plan ID if available
	var pricingPlanID *string
	if extra, ok := vehicleData["extra"].(map[string]any); ok {
		if planID, ok := extra["pricing_plan_id"].(string); ok && planID != "" {
			pricingPlanID = &planID
		}
	}

	// Build the mapped vehicle record
	mappedVehicle := map[string]any{
		"id":         mappedVehicleID,
		"network_id": networkID,
		"location":   location,
		"raw_data":   vehicleData,
	}

	// Add optional fields
	if vehicleType != nil {
		mappedVehicle["vehicle_type"] = *vehicleType
	}
	if batteryLevel != nil {
		mappedVehicle["battery_level"] = *batteryLevel
	}
	if isReserved != nil {
		mappedVehicle["is_reserved"] = *isReserved
	}
	if isDisabled != nil {
		mappedVehicle["is_disabled"] = *isDisabled
	}
	if lastReported != nil {
		mappedVehicle["last_reported"] = *lastReported
	}
	if pricingPlanID != nil {
		mappedVehicle["pricing_plan_id"] = *pricingPlanID
	}
	if rentalURIs != nil {
		mappedVehicle["rental_uris"] = rentalURIs
	}

	if Config.verbose {
		log.Printf("🛴 Mapped vehicle %s - type: %v, battery: %v, location: %s",
			mappedVehicleID, vehicleType, batteryLevel, location)
	}

	return mappedVehicle, nil
}
