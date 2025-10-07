package stationMapper

import (
	"gbfs-service/internal/envkeys"
)

type stationMapperConfig struct {
	verbose               bool
}

var Config = stationMapperConfig{
	verbose:               envkeys.Environment.Verbose,
}
