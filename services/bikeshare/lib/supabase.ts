import { createClient } from '@supabase/supabase-js'
import type { Database } from './db.types'

const supabase = createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!, {
  // Provide a custom schema. Defaults to "public".
  db: { schema: 'bikeshare' }
});