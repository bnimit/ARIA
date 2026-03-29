import type { FastifyInstance } from "fastify";
import { db, settings } from "@reddit-intel/db";
import { eq } from "drizzle-orm";

const SETTING_KEYS = {
  anthropicKey: "anthropicKey",
  openaiKey: "openaiKey",
  geminiKey: "geminiKey",
} as const;

type SettingKey = keyof typeof SETTING_KEYS;

function maskKey(value: string): string {
  if (value.length <= 8) return "********";
  return value.slice(0, 8) + "...";
}

export async function settingsRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/settings
   * Returns masked API key values (first 8 chars + "...").
   */
  fastify.get("/api/settings", async (_req, reply) => {
    const rows = await db
      .select()
      .from(settings)
      .where(
        // Fetch only the keys we care about
        (await import("drizzle-orm")).inArray(
          settings.key,
          Object.values(SETTING_KEYS),
        ),
      );

    const result: Partial<Record<SettingKey, string>> = {};
    for (const row of rows) {
      const key = row.key as SettingKey;
      if (key in SETTING_KEYS) {
        result[key] = maskKey(row.value);
      }
    }

    return reply.send(result);
  });

  /**
   * PUT /api/settings
   * Body: { anthropicKey?, openaiKey?, geminiKey? }
   * Upserts provided keys into the settings table.
   */
  fastify.put("/api/settings", async (req, reply) => {
    const body = req.body as Partial<Record<SettingKey, string>>;

    if (!body || typeof body !== "object") {
      return reply.status(400).send({ error: "Invalid request body" });
    }

    const updates: Array<{ key: string; value: string }> = [];

    for (const settingKey of Object.values(SETTING_KEYS) as SettingKey[]) {
      const value = body[settingKey];
      if (typeof value === "string" && value.trim().length > 0) {
        updates.push({ key: settingKey, value: value.trim() });
      }
    }

    if (updates.length === 0) {
      return reply.status(400).send({ error: "No valid keys provided" });
    }

    for (const { key, value } of updates) {
      await db
        .insert(settings)
        .values({ key, value, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value, updatedAt: new Date() },
        });
    }

    return reply.send({ ok: true });
  });
}
