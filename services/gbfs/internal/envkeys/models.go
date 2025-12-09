package envkeys

import "os"

type EnvVars struct {
	Verbose     bool
	SupabaseURL string
	SupabaseKey string

	// Poller settings
	EnablePoller bool // Enable REST API polling for vehicles
}

var Environment = EnvVars{
	Verbose:      os.Getenv("VERBOSE") == "true",
	SupabaseURL:  os.Getenv("SUPABASE_URL"),
	SupabaseKey:  os.Getenv("SUPABASE_KEY"),
	EnablePoller: os.Getenv("ENABLE_POLLER") != "false", // Enabled by default
}
