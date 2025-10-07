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

	// Use Supabase's batch upsert functionality
	if err := supabaseClient.BatchUpsertStations(b.Records); err != nil {
		log.Printf("Failed to batch upsert stations: %v", err)
		// Reset anyway to prevent infinite retries
		b.Reset()
		return err
	}

	// Reset the bucket after successful processing
	totalRecords := len(b.Records)
	b.Reset()

	if config.verbose {
		log.Printf("✅ Successfully processed all %d records in bucket", totalRecords)
	}

	return nil
}

func (b *BatchQueue) Reset() {
	b.RecordsCount = 0
	b.Checkpoint = time.Now()
	b.Records = make([]map[string]any, 0, b.MaxRecords)
}

func CreateBatchQueue(maxRecords int, maxAge time.Duration) *BatchQueue {
	return &BatchQueue{
		MaxRecords:   maxRecords,
		RecordsCount: 0,
		MaxAge:       maxAge,
		Checkpoint:   time.Now(),
		Records:      make([]map[string]any, 0, maxRecords),
	}
}
