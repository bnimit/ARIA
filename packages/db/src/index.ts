import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const connectionString = process.env.DATABASE_URL ?? "postgres://localhost:5432/reddit_intel";

// postgres-js connection — disable prefetch for serverless/edge compatibility
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });

// Re-export all schema tables for convenience
export { settings, subreddits, jobs, posts, comments, analyses } from "./schema.js";

// Re-export schema namespace for relation-aware queries
export { schema };
