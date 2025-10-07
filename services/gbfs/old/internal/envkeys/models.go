package envkeys

import "os"

type EnvVars struct {
	SupabaseURL       string
	SupabaseKey       string
	BootstrapNetworks bool
	Verbose           bool
}

var Environment = EnvVars{
	SupabaseURL:       os.Getenv("SUPABASE_URL"),
	SupabaseKey:       os.Getenv("SUPABASE_KEY"),
	BootstrapNetworks: os.Getenv("SPINROUTE_BOOTSTRAP_NETWORKS") == "true",
	Verbose:           os.Getenv("SPINROUTE_VERBOSE") == "true",
}
