package batchqueue

import "time"

// RecordType identifies the type of record in the queue
type RecordType string

const (
	RecordTypeStation RecordType = "station"
	RecordTypeVehicle RecordType = "vehicle"
)

type BatchQueue struct {
	MaxRecords   int
	RecordsCount int
	MaxAge       time.Duration
	Checkpoint   time.Time
	Records      []map[string]any
	RecordType   RecordType // Type of records in this queue
}
