package batchqueue

import (
	"log"
	"time"

	"github.com/supabase-community/supabase-go"
)

func (b *BatchQueue) Add(record map[string]any) {
	b.RecordsCount++
	b.Records = append(b.Records, record)
}

func (b *BatchQueue) IsFull() bool {
	return b.RecordsCount >= b.MaxRecords || time.Since(b.Checkpoint) >= b.MaxAge
}

func (b *BatchQueue) FlushQueue(dbClient *supabase.Client, processor func(dbClient *supabase.Client, record map[string]any) error) error {
	// Process and save all records in the bucket
	successCount := 0
	failureCount := 0

	for _, record := range b.Records {
		if err := processor(dbClient, record); err != nil {
			// Log the failure but continue processing other records
			log.Printf("Failed to process station %v: %v", record["id"], err)
			failureCount++
		} else {
			successCount++
		}
	}

	// Always reset the bucket after processing
	totalRecords := len(b.Records)
	b.Reset()

	// Log summary if there were any failures
	if failureCount > 0 {
		log.Printf("Bucket processing completed: %d successful, %d failed out of %d total",
			successCount, failureCount, totalRecords)
	} else if config.verbose {
		log.Printf("✅ Successfully processed all %d records in bucket", successCount)
	}

	// Return nil to keep the WebSocket stream running
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
