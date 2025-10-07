package batchqueue

import "time"

type BatchQueue struct {
	MaxRecords   int
	RecordsCount int
	MaxAge       time.Duration
	Checkpoint   time.Time
	Records      []map[string]any
}
