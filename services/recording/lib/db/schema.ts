import { sql } from 'drizzle-orm';
import {
  text,
  timestamp,
  uuid,
  jsonb,
  pgSchema,
  index,
  pgEnum,
  boolean,
} from 'drizzle-orm/pg-core';

export const routingSchema = pgSchema('routing');

export const routingProvider = routingSchema.table(
  'provider',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .default(sql`(now() AT TIME ZONE 'utc'::text)`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .default(sql`(now() AT TIME ZONE 'utc'::text)`)
      .notNull(),
    name: text('name').notNull(),
    apiUrl: text('api_url').notNull(),
    requiresAuth: boolean('requires_auth').default(false).notNull(),
    premium: boolean('premium').default(false).notNull(),
    metadata: jsonb('metadata').notNull(),
  },
  (table) => [index('provider_name_index').on(table.name)],
);
