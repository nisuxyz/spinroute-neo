-- Optional: Create a database function for efficient stale network lookup
-- Run this migration if you want better performance for the refresh script

CREATE OR REPLACE FUNCTION bikeshare.get_stale_networks(
  threshold_time TIMESTAMPTZ,
  max_results INT DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  station_status_url TEXT,
  station_information_url TEXT,
  oldest_fetched_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    n.id,
    n.name,
    n.station_status_url,
    n.station_information_url,
    MIN(s.fetched_at) as oldest_fetched_at
  FROM bikeshare.network n
  LEFT JOIN bikeshare.station s ON s.network_id = n.id
  WHERE n.station_status_url IS NOT NULL
  GROUP BY n.id, n.name, n.station_status_url, n.station_information_url
  HAVING MIN(s.fetched_at) IS NULL OR MIN(s.fetched_at) < threshold_time
  ORDER BY oldest_fetched_at ASC NULLS FIRST
  LIMIT max_results;
$$;

COMMENT ON FUNCTION bikeshare.get_stale_networks IS 
  'Returns networks with station data older than the threshold, ordered by staleness';
