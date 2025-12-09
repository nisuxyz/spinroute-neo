#!/usr/bin/env bun
/**
 * Refresh Stale Stations Script
 *
 * Fetches and updates bikeshare station data for networks whose stations
 * haven't been updated recently. Uses the citybik.es REST API which matches
 * the WebSocket data format used by the GBFS service.
 *
 * Usage:
 *   bun run scripts/refresh-stale-stations.ts
 *
 * Environment variables:
 *   SUPABASE_URL - Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key for admin access
 *   STALE_THRESHOLD_MINUTES - How old data must be to refresh (default: 30)
 *   BATCH_SIZE - Max networks to process per run (default: 100)
 *   DRY_RUN - Set to "true" to preview without updating (default: false)
 */

import { createClient } from '@supabase/supabase-js';

// Configuration
const config = {
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  staleThresholdMinutes: parseInt(process.env.STALE_THRESHOLD_MINUTES || '30', 10),
  batchSize: parseInt(process.env.BATCH_SIZE || '100', 10),
  dryRun: process.env.DRY_RUN === 'true',
};

// Validate required env vars
if (!config.supabaseUrl || !config.supabaseKey) {
  console.error(
    '❌ Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY',
  );
  process.exit(1);
}

const supabase = createClient(config.supabaseUrl, config.supabaseKey, {
  db: { schema: 'bikeshare' },
  auth: { autoRefreshToken: false, persistSession: false },
});

// Types
interface Network {
  id: string;
  name: string;
  raw_data: { id: string } | null; // Contains the original citybik.es network ID
}

interface StaleNetwork extends Network {
  oldest_fetched_at: string;
  citybikes_id: string; // The original network ID from citybik.es
}

// citybik.es API response types (matches WebSocket format)
interface CityBikesStation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  free_bikes: number;
  empty_slots: number | null;
  timestamp: string;
  extra?: {
    address?: string;
    slots?: number;
    normal_bikes?: number;
    ebikes?: number;
    has_ebikes?: boolean;
    renting?: boolean | number;
    returning?: boolean | number;
    online?: boolean | number;
    operational?: boolean | number;
    status?: string;
    virtual?: boolean | number;
    uid?: string;
  };
}

interface CityBikesNetworkResponse {
  network: {
    id: string;
    name: string;
    stations: CityBikesStation[];
  };
}

/**
 * Find networks with stale station data
 */
async function findStaleNetworks(): Promise<StaleNetwork[]> {
  const staleThreshold = new Date(
    Date.now() - config.staleThresholdMinutes * 60 * 1000,
  ).toISOString();

  // Get networks with their oldest station fetch time
  const { data: networks, error: networkError } = await supabase
    .from('network')
    .select('id, name, raw_data')
    .not('raw_data', 'is', null);

  if (networkError) {
    throw new Error(`Failed to fetch networks: ${networkError.message}`);
  }

  if (!networks || networks.length === 0) {
    return [];
  }

  // For each network, check if it has stale stations
  const staleNetworks: StaleNetwork[] = [];

  for (const network of networks) {
    // Extract the original citybik.es network ID from raw_data
    const citybikesId = (network.raw_data as { id?: string })?.id;
    if (!citybikesId) {
      continue; // Skip networks without citybik.es ID
    }

    const { data: oldestStation, error: stationError } = await supabase
      .from('station')
      .select('fetched_at')
      .eq('network_id', network.id)
      .order('fetched_at', { ascending: true })
      .limit(1)
      .single();

    if (stationError && stationError.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is fine
      continue;
    }

    // If no stations or oldest is stale, add to list
    if (!oldestStation || oldestStation.fetched_at < staleThreshold) {
      staleNetworks.push({
        ...network,
        oldest_fetched_at: oldestStation?.fetched_at || '1970-01-01T00:00:00Z',
        citybikes_id: citybikesId,
      });
    }

    if (staleNetworks.length >= config.batchSize) {
      break;
    }
  }

  // Sort by oldest first
  return staleNetworks.sort(
    (a, b) => new Date(a.oldest_fetched_at).getTime() - new Date(b.oldest_fetched_at).getTime(),
  );
}

/**
 * Fetch network data from citybik.es REST API
 */
async function fetchCityBikesNetwork(networkId: string): Promise<CityBikesNetworkResponse | null> {
  try {
    const url = `https://api.citybik.es/v2/networks/${networkId}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'SpinRoute-Neo/1.0 (station-refresh)' },
    });

    if (!response.ok) {
      console.warn(`  ⚠️  HTTP ${response.status} from citybik.es`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.warn(`  ⚠️  Failed to fetch from citybik.es: ${error}`);
    return null;
  }
}

/**
 * Generate deterministic UUID from string (matches Go uuidfy logic)
 */
function uuidfy(input: string): string {
  const hash = Bun.hash(input).toString(16).padStart(32, '0');
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    hash.slice(12, 16),
    hash.slice(16, 20),
    hash.slice(20, 32),
  ].join('-');
}

/**
 * Parse timestamp flexibly (matches Go parseTimestampFlexible)
 */
function parseTimestamp(ts: string): Date | null {
  if (!ts) return null;

  // Remove trailing Z if there's already a timezone offset
  let cleaned = ts;
  if (ts.endsWith('Z') && (ts.includes('+') || ts.slice(0, -1).includes('-'))) {
    cleaned = ts.slice(0, -1);
  }

  const date = new Date(cleaned);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Map station data from citybik.es format to database format
 * (Matches the Go MapStationData function logic)
 */
function mapStationData(station: CityBikesStation, networkId: string): Record<string, unknown> {
  const extra = station.extra || {};
  const freeBikes = station.free_bikes ?? 0;
  const emptySlots = station.empty_slots ?? 0;

  // Determine if virtual station
  let isVirtual = false;
  if (extra.virtual !== undefined) {
    isVirtual = extra.virtual === true || extra.virtual === 1;
  } else if (extra.uid === 'virtual') {
    isVirtual = true;
  }

  // Calculate capacity
  let capacity: number;
  if (isVirtual) {
    // Virtual stations: use slots from extra or just free bikes
    capacity = (extra.slots as number) || freeBikes || 0;
  } else {
    // Regular stations: calculate from available data
    if (emptySlots >= 0 && freeBikes >= 0) {
      capacity = emptySlots + freeBikes;
    } else if (extra.slots && extra.slots > 0) {
      capacity = extra.slots;
    } else {
      capacity = freeBikes > 0 ? freeBikes : 0;
    }
  }

  // Determine operational status
  let isOperational = capacity > 0;
  if (extra.operational !== undefined) {
    isOperational = extra.operational === true || extra.operational === 1;
  } else if (extra.online !== undefined) {
    isOperational = extra.online === true || extra.online === 1;
  } else if (extra.status === 'closed' || extra.status === 'offline') {
    isOperational = false;
  }

  // Extract renting status
  let isRenting: boolean | null = null;
  if (!isOperational) {
    isRenting = false;
  } else if (extra.renting !== undefined) {
    isRenting = extra.renting === true || extra.renting === 1;
  } else if (
    extra.status === 'closed' ||
    extra.status === 'offline' ||
    extra.status === 'maintenance'
  ) {
    isRenting = false;
  } else if (extra.status === 'open' || extra.status === 'active') {
    isRenting = true;
  } else if (isOperational && freeBikes > 0) {
    isRenting = true;
  } else if (isOperational && freeBikes === 0) {
    isRenting = false;
  }

  // Extract returning status
  let isReturning: boolean | null = null;
  if (!isOperational) {
    isReturning = false;
  } else if (extra.returning !== undefined) {
    isReturning = extra.returning === true || extra.returning === 1;
  } else if (
    extra.status === 'closed' ||
    extra.status === 'offline' ||
    extra.status === 'maintenance'
  ) {
    isReturning = false;
  } else if (extra.status === 'open' || extra.status === 'active') {
    isReturning = true;
  } else if (isVirtual && isOperational) {
    isReturning = true;
  } else if (isOperational && emptySlots > 0) {
    isReturning = true;
  }

  // Extract bike counts
  const numEbikes = (extra.ebikes as number) || 0;
  const numRegularBikes = (extra.normal_bikes as number) ?? Math.max(0, freeBikes - numEbikes);

  // Parse timestamp
  const parsedTime = parseTimestamp(station.timestamp);
  const lastReported = parsedTime?.toISOString() || new Date().toISOString();
  const now = new Date().toISOString();

  return {
    id: uuidfy(station.id),
    network_id: networkId,
    name: station.name,
    location: `POINT(${station.longitude} ${station.latitude})`,
    address: extra.address || null,
    capacity,
    num_docks_available: Math.max(0, emptySlots),
    num_ebikes_available: numEbikes,
    num_bikes_available: numRegularBikes,
    is_operational: isOperational,
    is_renting: isRenting,
    is_returning: isReturning,
    is_virtual: isVirtual,
    last_reported: lastReported,
    fetched_at: now,
    raw_data: station,
  };
}

/**
 * Update stations for a network
 */
async function updateNetworkStations(network: StaleNetwork): Promise<number> {
  // Fetch from citybik.es REST API
  const response = await fetchCityBikesNetwork(network.citybikes_id);
  if (!response?.network?.stations) {
    console.log(`  ⚠️  No station data from citybik.es`);
    return 0;
  }

  const stations = response.network.stations.map((s) => mapStationData(s, network.id));

  if (stations.length === 0) {
    console.log(`  ⚠️  No valid stations for ${network.name}`);
    return 0;
  }

  if (config.dryRun) {
    console.log(`  🔍 [DRY RUN] Would update ${stations.length} stations`);
    return stations.length;
  }

  // Batch upsert stations
  const { error } = await supabase.from('station').upsert(stations, { onConflict: 'id' });

  if (error) {
    console.error(`  ❌ Failed to update: ${error.message}`);
    return 0;
  }

  return stations.length;
}

/**
 * Main execution
 */
async function main() {
  console.log('🚴 SpinRoute Station Refresh Script');
  console.log(`   Stale threshold: ${config.staleThresholdMinutes} minutes`);
  console.log(`   Batch size: ${config.batchSize} networks`);
  if (config.dryRun) {
    console.log('   Mode: DRY RUN (no changes will be made)');
  }
  console.log('');

  try {
    // Find stale networks
    console.log('🔍 Finding networks with stale station data...');
    const staleNetworks = await findStaleNetworks();

    if (staleNetworks.length === 0) {
      console.log('✅ All station data is fresh!');
      return;
    }

    console.log(`📋 Found ${staleNetworks.length} network(s) with stale data\n`);

    // Process each network
    let totalUpdated = 0;
    let networksProcessed = 0;

    for (const network of staleNetworks) {
      const age = Math.round((Date.now() - new Date(network.oldest_fetched_at).getTime()) / 60000);
      console.log(`📡 ${network.name} (${age} min old)`);

      const updated = await updateNetworkStations(network);
      if (updated > 0) {
        console.log(`  ✅ Updated ${updated} stations`);
        totalUpdated += updated;
        networksProcessed++;
      }
    }

    console.log('');
    console.log('📊 Summary:');
    console.log(`   Networks processed: ${networksProcessed}/${staleNetworks.length}`);
    console.log(`   Stations updated: ${totalUpdated}`);
    console.log('✅ Done!');
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

main();
