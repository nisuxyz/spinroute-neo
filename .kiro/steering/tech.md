---
inclusion: always
---

# Technology Stack

## Architecture: Database-First

Direct Supabase access with RLS policies. Microservices only for external data ingestion (GBFS/Go) and complex computation (Routing/Hono).

## Critical Rules

- **Never manually edit** `supabase/types.ts` — always regenerate via CLI
- **Use Podman**, not Docker, for containers
- **Bun** is the primary package manager and runtime
- **Biome** handles formatting/linting (configured in `biome.json`)
- **RLS policies** enforce all data access — no backend auth checks needed
- **Schema distinction**: `bikeshare` = public bikeshare data; `vehicles` = user-owned bikes

## Database Schemas

| Schema | Purpose |
|--------|---------|
| `public` | User profiles, auth, subscriptions |
| `bikeshare` | Station data, free-floating vehicles (citybik.es) |
| `vehicles` | User-owned bikes, maintenance records |
| `recording` | Trip recordings, analytics, sensor data |
| `safety` | Location sharing, emergency contacts, crash detection |
| `social` | Achievements, leaderboards, challenges |

## Type Generation

After any schema change, regenerate types:
```bash
supabase gen types typescript --project-id ftvjoeosbmwedpeekupl --schema=public,bikeshare,vehicles,recording,social > supabase/types.ts
```

## Code Style

- 2-space indentation
- 100-character line width
- Single quotes for JS/TS
- Husky pre-commit hooks enforce Biome formatting

## Stack Reference

| Layer | Technology |
|-------|------------|
| Mobile | React Native + Expo (~54.0), Expo Router, @rnmapbox/maps |
| Web | Astro (~5.13) |
| Backend | Supabase (PostgreSQL + PostGIS + RLS + Real-time) |
| GBFS Service | Go, Fly.io |
| Routing Service | Hono + Bun, Fly.io |
| Containers | Podman, `Containerfile` / `Containerfile.dev` |

## Frontend Expo Rules

### Styling
- **NativeWind only** — do not use `StyleSheet.create()` or inline style objects
- Use Tailwind classes via `className` prop on all components
- Theme colors defined in `tailwind.config.js` and `global.css`

### Components
- **Reuse existing components** from `frontend-expo/components/` before creating new ones
- Check for existing UI primitives in `frontend-expo/components/ui/`
- Common reusable components: `Card`, `Text`, `Input`, `Button`, `BaseSheet`
- **Always** use `frontend-expo/components/icon`, not `frontend-expo/components/ui/icon`

### Loading States
- **Use skeleton loaders**, not `ActivityIndicator`
- Skeleton loaders provide better UX by showing content shape during loading
- Match skeleton dimensions to expected content layout

```tsx
// ✅ Good - Skeleton loader
{loading ? (
  <View className="h-12 w-full rounded-lg bg-gray-200 animate-pulse" />
) : (
  <Text className="text-lg">{data.title}</Text>
)}

// ❌ Bad - ActivityIndicator
{loading ? <ActivityIndicator /> : <Text>{data.title}</Text>}
```

### Hooks
- Custom hooks in `frontend-expo/hooks/` follow `use-*.ts` naming
- Direct Supabase queries with RLS enforcement
- Use `react-supabase` hooks where applicable (`useSelect`, `useRealtime`, etc.)

## Common Commands

```bash
# Root
bun install && bun run format

# Frontend Expo
bun run start          # Dev server
bun run ios            # iOS simulator
bun run android        # Android emulator

# Containers (local dev)
podman compose up -d   # Start
podman compose down    # Stop

# Supabase migrations
supabase migration new <name>
supabase db push
```

## Development Patterns

### Frontend Data Access
```typescript
// Direct queries with RLS
const { data } = await supabase.from('bikeshare.stations').select('*').eq('city', 'Toronto');

// Real-time subscriptions
supabase.channel('stations').on('postgres_changes', { event: '*', schema: 'bikeshare' }, handler).subscribe();

// File uploads
const { data } = await supabase.storage.from('bike-pictures').upload(`${userId}/${bikeId}/${filename}`, file);
```

### Database Business Logic
```sql
-- Use Postgres functions for complex logic
CREATE FUNCTION calculate_trip_stats(user_id UUID) RETURNS TABLE(...) AS $$ ... $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Use triggers for automated processing
CREATE TRIGGER update_maintenance AFTER INSERT ON recording.trips FOR EACH ROW EXECUTE FUNCTION check_maintenance_due();

-- RLS for feature gating
CREATE POLICY "premium_unlimited_bikes" ON vehicles.bikes FOR INSERT TO authenticated
  USING ((SELECT subscription_tier FROM public.profiles WHERE id = auth.uid()) = 'premium' OR (SELECT COUNT(*) FROM vehicles.bikes WHERE user_id = auth.uid()) < 3);
```

### Feature Gating
```typescript
// RLS enforces limits; frontend checks for UI only
const { data: profile } = await supabase.from('profiles').select('subscription_tier').single();
const isPremium = profile?.subscription_tier === 'premium';
```

## Microservices

### GBFS Service (Go)
- Continuous ingestion from 400+ city feeds via citybik.es
- Stores station and free-floating vehicle data in `bikeshare` schema
- Deployed on Fly.io

### Routing Service (TypeScript/Hono)
- Complex route calculation and provider normalization
- Uses `shared-utils` workspace package
- Deployed on Fly.io
