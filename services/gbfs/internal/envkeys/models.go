package envkeys

import "os"

type EnvVars struct {
	// ConsumeWS   bool
	Verbose     bool
	SupabaseURL string
	SupabaseKey string
}

var Environment = EnvVars{
	// ConsumeWS:   os.Getenv("SPINROUTE_CONSUME_WS") == "true",
	Verbose:     os.Getenv("VERBOSE") == "true",
	SupabaseURL: os.Getenv("SUPABASE_URL"),
	SupabaseKey: os.Getenv("SUPABASE_API_KEY"),
}
