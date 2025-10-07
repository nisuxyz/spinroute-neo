package citybikeswebsocket

import (
	"gbfs-service/internal/envkeys"
	"time"
)

type citybikeswebsocketConfig struct {
	verbose               bool
	maxReconnectAttempts  int
	baseReconnectDelay    time.Duration
	websocketPingInterval time.Duration
}

var Config = citybikeswebsocketConfig{
	verbose:               envkeys.Environment.Verbose,
	maxReconnectAttempts:  10,
	baseReconnectDelay:    5 * time.Second,
	websocketPingInterval: 25 * time.Second,
}
