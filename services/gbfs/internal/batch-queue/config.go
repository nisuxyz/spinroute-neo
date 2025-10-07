package batchqueue

import "gbfs-service/internal/envkeys"

type batchQueueConfig struct {
	verbose bool
}

var config = batchQueueConfig{
	verbose: envkeys.Environment.Verbose,
}
