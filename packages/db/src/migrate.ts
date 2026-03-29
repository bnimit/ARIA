/**
 * Migration runner — reads SQL files from ./drizzle/ in lexicographic order
 * and executes each one against the DATABASE_URL connection.
 *
 * Usage:  bun src/migrate.ts
 */

import postgres from "postgres";
import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const DATABASE_URL = process.env.DATABASE_URL ?? "postgres://localhost:5432/reddit_intel";

async function migrate() {
  const sql = postgres(DATABASE_URL, { max: 1 });

  try {
    // Resolve the drizzle output directory relative to this file's location
    const migrationsDir = resolve(import.meta.dirname ?? process.cwd(), "../drizzle");

    let files: string[];
    try {
      const entries = await readdir(migrationsDir);
      files = entries
        .filter((f) => f.endsWith(".sql"))
        .sort(); // lexicographic = chronological for drizzle-kit names
    } catch (err) {
      console.error(`Could not read migrations directory at ${migrationsDir}:`, err);
      process.exit(1);
    }

    if (files.length === 0) {
      console.log("No migration files found — nothing to run.");
      process.exit(0);
    }

    // Ensure migrations tracking table exists
    await sql`
      CREATE TABLE IF NOT EXISTS __migrations (
        id         SERIAL PRIMARY KEY,
        filename   VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `;

    for (const filename of files) {
      // Skip if already applied
      const [existing] = await sql`
        SELECT id FROM __migrations WHERE filename = ${filename}
      `;

      if (existing) {
        console.log(`  SKIP  ${filename}  (already applied)`);
        continue;
      }

      const filepath = join(migrationsDir, filename);
      const sqlText = await readFile(filepath, "utf-8");

      console.log(`  RUN   ${filename}`);

      // Execute the migration inside a transaction
      await sql.begin(async (tx) => {
        await tx.unsafe(sqlText);
        await tx.unsafe(`INSERT INTO __migrations (filename) VALUES ('${filename.replace(/'/g, "''")}')`);
      });

      console.log(`  OK    ${filename}`);
    }

    console.log("\nAll migrations applied successfully.");
    process.exit(0);
  } catch (err) {
    console.error("\nMigration failed:", err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

migrate();
