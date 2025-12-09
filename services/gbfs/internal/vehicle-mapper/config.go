package vehicleMapper

import (
	"gbfs-service/internal/envkeys"
)

type vehicleMapperConfig struct {
	verbose bool
}

var Config = vehicleMapperConfig{
	verbose: envkeys.Environment.Verbose,
}
