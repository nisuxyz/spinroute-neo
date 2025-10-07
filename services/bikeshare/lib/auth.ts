import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI } from "better-auth/plugins";
import { db } from "~lib/drizzle"; // your drizzle instance
import { user, session, account, verification } from "./db/schema"; // your drizzle schema

export const auth = betterAuth({
  plugins: [
    openAPI(),
  ],
  database: drizzleAdapter(db, {
      provider: "pg", // or "mysql", "sqlite"
      schema: {
        user,
        session,
        account,
        verification,
      }
  }),
  telemetry: { enabled: false },
  emailAndPassword: {
    enabled: true,
  },
});