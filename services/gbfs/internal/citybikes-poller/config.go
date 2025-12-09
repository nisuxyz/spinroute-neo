package citybikespoller

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type pollerConfig struct {
	// Networks to poll (comma-separated network IDs from citybik.es)
	// e.g., "capital-bikeshare,citi-bike-nyc"
	NetworkIDs []string

	// Rate limit: requests per hour (default 240, max safe is ~300)
	RequestsPerHour int

	// Calculated polling interval based on rate limit and number of networks
	PollingInterval time.Duration

	// HTTP client settings
	UserAgent string
	Origin    string
	Referer   string
}

var Config pollerConfig

func init() {
	// Parse network IDs from environment
	networkIDsStr := os.Getenv("CITYBIKES_POLL_NETWORKS")
	if networkIDsStr == "" {
		// Default to Capital Bikeshare (Washington DC)
		networkIDsStr = "capital-bikeshare"
	}
	Config.NetworkIDs = strings.Split(networkIDsStr, ",")
	for i, id := range Config.NetworkIDs {
		Config.NetworkIDs[i] = strings.TrimSpace(id)
	}

	// Parse rate limit
	Config.RequestsPerHour = 240 // Safe default under 300/hour limit
	if rateStr := os.Getenv("CITYBIKES_REQUESTS_PER_HOUR"); rateStr != "" {
		if rate, err := strconv.Atoi(rateStr); err == nil && rate > 0 {
			Config.RequestsPerHour = rate
		}
	}

	// Calculate polling interval
	// If we have N networks and can make R requests/hour, each network gets R/N requests/hour
	// Interval = 3600 seconds / (R/N) = 3600*N/R seconds
	numNetworks := len(Config.NetworkIDs)
	if numNetworks == 0 {
		numNetworks = 1
	}
	intervalSeconds := (3600 * numNetworks) / Config.RequestsPerHour
	if intervalSeconds < 15 {
		intervalSeconds = 15 // Minimum 15 seconds between requests
	}
	Config.PollingInterval = time.Duration(intervalSeconds) * time.Second

	// HTTP headers to mimic browser request
	Config.UserAgent = "Mozilla/5.0 (X11; Linux x86_64; rv:145.0) Gecko/20100101 Firefox/145.0"
	Config.Origin = "https://citybik.es"
	Config.Referer = "https://citybik.es/"
}
