package batchqueue

import (
	supabaseClient "gbfs-service/internal/supabase"
	"log"
	"time"
)

func (b *BatchQueue) Add(record map[string]any) {
	b.RecordsCount++
	b.Records = append(b.Records, record)
}

func (b *BatchQueue) IsFull() bool {
	return b.RecordsCount >= b.MaxRecords || time.Since(b.Checkpoint) >= b.MaxAge
}

func (b *BatchQueue) FlushQueue() error {
	if len(b.Records) == 0 {
		return nil
	}

	var err error

	// Use appropriate upsert based on record type
	switch b.RecordType {
	case RecordTypeVehicle:
		err = supabaseClient.BatchUpsertVehicles(b.Records)
		if err != nil {
			log.Printf("Failed to batch upsert vehicles: %v", err)
		}
	case RecordTypeStation:
		fallthrough
	default:
		err = supabaseClient.BatchUpsertStations(b.Records)
		if err != nil {
			log.Printf("Failed to batch upsert stations: %v", err)
		}
	}

	// Reset the bucket after processing (success or failure)
	totalRecords := len(b.Records)
	recordType := b.RecordType
	b.Reset()

	if err != nil {
		return err
	}

	if config.verbose {
		log.Printf("✅ Successfully processed all %d %s records in bucket", totalRecords, recordType)
	}

	return nil
}

func (b *BatchQueue) Reset() {
	b.RecordsCount = 0
	b.Checkpoint = time.Now()
	b.Records = make([]map[string]any, 0, b.MaxRecords)
}

// CreateBatchQueue creates a new batch queue for stations (default)
func CreateBatchQueue(maxRecords int, maxAge time.Duration) *BatchQueue {
	return &BatchQueue{
		MaxRecords:   maxRecords,
		RecordsCount: 0,
		MaxAge:       maxAge,
		Checkpoint:   time.Now(),
		Records:      make([]map[string]any, 0, maxRecords),
		RecordType:   RecordTypeStation,
	}
}

// CreateVehicleBatchQueue creates a new batch queue for vehicles
func CreateVehicleBatchQueue(maxRecords int, maxAge time.Duration) *BatchQueue {
	return &BatchQueue{
		MaxRecords:   maxRecords,
		RecordsCount: 0,
		MaxAge:       maxAge,
		Checkpoint:   time.Now(),
		Records:      make([]map[string]any, 0, maxRecords),
		RecordType:   RecordTypeVehicle,
	}
}
