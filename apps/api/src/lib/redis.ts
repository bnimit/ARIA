import IORedis from "ioredis";

export function parseRedisUrl(url: string): { host: string; port: number } {
  const u = new URL(url);
  return { host: u.hostname || "127.0.0.1", port: Number(u.port) || 6379 };
}

export const redisConnection = parseRedisUrl(
  process.env.REDIS_URL ?? "redis://localhost:6381",
);

/**
 * Create a fresh ioredis client from the same connection settings.
 * Used for pub/sub where BullMQ's connection cannot be shared.
 */
export function createRedisClient(): IORedis {
  return new IORedis({
    host: redisConnection.host,
    port: redisConnection.port,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}
