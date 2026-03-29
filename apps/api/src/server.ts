import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { settingsRoutes } from "./routes/settings.js";
import { subredditsRoutes } from "./routes/subreddits.js";
import { jobsRoutes } from "./routes/jobs.js";
import { analysesRoutes } from "./routes/analyses.js";
import { authRoutes } from "./routes/auth.js";

const PORT = Number(process.env.PORT ?? 3001);
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:3000";
const JWT_SECRET = process.env.JWT_SECRET ?? "aria-dev-secret-change-in-production-please";

async function buildServer() {
  const fastify = Fastify({
    logger: { level: process.env.LOG_LEVEL ?? "info" },
  });

  // ── JWT ────────────────────────────────────────────────────────────────────
  await fastify.register(jwt, { secret: JWT_SECRET });

  // Decorator used by protected routes: fastify.authenticate
  fastify.decorate("authenticate", async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch {
      reply.status(401).send({ message: "Unauthorized" });
    }
  });

  // ── CORS ──────────────────────────────────────────────────────────────────
  await fastify.register(cors, {
    origin: FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });

  // ── Routes ────────────────────────────────────────────────────────────────
  await fastify.register(authRoutes);
  await fastify.register(settingsRoutes);
  await fastify.register(subredditsRoutes);
  await fastify.register(jobsRoutes);
  await fastify.register(analysesRoutes);

  // ── Health check ──────────────────────────────────────────────────────────
  fastify.get("/health", async () => ({ ok: true, ts: new Date().toISOString() }));

  return fastify;
}

async function start() {
  const fastify = await buildServer();

  // Start BullMQ workers in-process (alongside the HTTP server).
  // In production, run workers as a separate process with `bun run worker`.
  const { scraperWorker, analyzerWorker } = await import("./worker.js");

  try {
    await fastify.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`ARIA API running on http://0.0.0.0:${PORT}`);
    console.log(`Workers: scraper + analyzer started`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }

  process.on("SIGINT", async () => {
    console.log("\nGraceful shutdown...");
    await scraperWorker.close();
    await analyzerWorker.close();
    await fastify.close();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await scraperWorker.close();
    await analyzerWorker.close();
    await fastify.close();
    process.exit(0);
  });
}

start();
