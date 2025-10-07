package supabase

import (
	"log"
	"os"

	supa "github.com/supabase-community/supabase-go"
)

type SupabaseConfig struct {
	URL    string
	APIKey string
	Client *supa.Client
}

var Config *SupabaseConfig

// InitSupabase initializes the Supabase client
func InitSupabase() error {
	url := os.Getenv("SUPABASE_URL")
	apiKey := os.Getenv("SUPABASE_KEY")

	if url == "" || apiKey == "" {
		log.Fatal("SUPABASE_URL and SUPABASE_KEY environment variables are required")
	}

	client, err := supa.NewClient(url, apiKey, &supa.ClientOptions{
		Schema: "bikeshare", // Set default schema to 'bikeshare'
	})
	if err != nil {
		return err
	}

	Config = &SupabaseConfig{
		URL:    url,
		APIKey: apiKey,
		Client: client,
	}

	log.Println("✅ Supabase client initialized successfully")
	return nil
}
