import type { FastifyInstance } from "fastify";
import IORedis from "ioredis";
import { db, jobs, subreddits } from "@reddit-intel/db";
import { eq, desc, and } from "drizzle-orm";
import { scrapeQueue } from "../lib/queue.js";
import { redisConnection } from "../lib/redis.js";

export async function jobsRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/jobs
   * List all jobs ordered by createdAt DESC.
   * Optional query param: ?subreddit=name
   */
  fastify.get("/api/jobs", async (req, reply) => {
    const { subreddit: subredditFilter } = req.query as { subreddit?: string };

    let query = db
      .select({
        id: jobs.id,
        subredditId: jobs.subredditId,
        subredditName: subreddits.name,
        status: jobs.status,
        pagesTarget: jobs.pagesTarget,
        pagesScraped: jobs.pagesScraped,
        postsFound: jobs.postsFound,
        commentsFound: jobs.commentsFound,
        error: jobs.error,
        lastAfter: jobs.lastAfter,
        startedAt: jobs.startedAt,
        completedAt: jobs.completedAt,
        createdAt: jobs.createdAt,
      })
      .from(jobs)
      .innerJoin(subreddits, eq(jobs.subredditId, subreddits.id))
      .$dynamic();

    if (subredditFilter) {
      query = query.where(eq(subreddits.name, subredditFilter));
    }

    const rows = await query.orderBy(desc(jobs.createdAt));

    return reply.send(rows);
  });

  /**
   * POST /api/jobs
   * Body: { subreddit: string; pagesTarget?: number }
   * Creates a job and enqueues it.
   */
  fastify.post("/api/jobs", async (req, reply) => {
    const body = req.body as { subreddit?: string; pagesTarget?: number };

    if (!body?.subreddit || typeof body.subreddit !== "string") {
      return reply.status(400).send({ error: "subreddit is required" });
    }

    const subredditName = body.subreddit.trim().replace(/^r\//, "");
    const pagesTarget = typeof body.pagesTarget === "number" ? body.pagesTarget : 8;

    if (pagesTarget < 1 || pagesTarget > 50) {
      return reply.status(400).send({ error: "pagesTarget must be between 1 and 50" });
    }

    // Find or create subreddit
    let [sub] = await db
      .select({ id: subreddits.id, name: subreddits.name })
      .from(subreddits)
      .where(eq(subreddits.name, subredditName));

    if (!sub) {
      const [created] = await db
        .insert(subreddits)
        .values({ name: subredditName })
        .returning({ id: subreddits.id, name: subreddits.name });
      sub = created;
    }

    // Insert job record
    const [job] = await db
      .insert(jobs)
      .values({
        subredditId: sub.id,
        status: "queued",
        pagesTarget,
      })
      .returning();

    // Enqueue scrape task
    await scrapeQueue.add(
      `scrape-${subredditName}-${job.id}`,
      {
        jobId: job.id,
        subreddit: subredditName,
        pagesTarget,
        resumeAfter: null,
      },
      { jobId: job.id },
    );

    return reply.status(201).send({ ...job, subredditName: sub.name });
  });

  /**
   * GET /api/jobs/:id
   * Single job by UUID.
   */
  fastify.get("/api/jobs/:id", async (req, reply) => {
    const { id } = req.params as { id: string };

    const [row] = await db
      .select({
        id: jobs.id,
        subredditId: jobs.subredditId,
        subredditName: subreddits.name,
        status: jobs.status,
        pagesTarget: jobs.pagesTarget,
        pagesScraped: jobs.pagesScraped,
        postsFound: jobs.postsFound,
        commentsFound: jobs.commentsFound,
        error: jobs.error,
        lastAfter: jobs.lastAfter,
        startedAt: jobs.startedAt,
        completedAt: jobs.completedAt,
        createdAt: jobs.createdAt,
      })
      .from(jobs)
      .innerJoin(subreddits, eq(jobs.subredditId, subreddits.id))
      .where(eq(jobs.id, id));

    if (!row) {
      return reply.status(404).send({ error: "Job not found" });
    }

    return reply.send(row);
  });

  /**
   * DELETE /api/jobs/:id
   * Cancels a queued or running job.
   */
  fastify.delete("/api/jobs/:id", async (req, reply) => {
    const { id } = req.params as { id: string };

    const [job] = await db
      .select({ id: jobs.id, status: jobs.status })
      .from(jobs)
      .where(eq(jobs.id, id));

    if (!job) {
      return reply.status(404).send({ error: "Job not found" });
    }

    if (job.status !== "queued" && job.status !== "running") {
      return reply.status(400).send({
        error: `Cannot cancel job in status '${job.status}'`,
      });
    }

    // Mark cancelled in DB
    await db.update(jobs).set({ status: "cancelled" }).where(eq(jobs.id, id));

    // Attempt to remove from BullMQ queue (best-effort — may already be running)
    try {
      const bullJob = await scrapeQueue.getJob(id);
      if (bullJob) {
        await bullJob.remove();
      }
    } catch {
      // Ignore — worker will check job status and bail if 'cancelled'
    }

    return reply.send({ ok: true });
  });

  /**
   * GET /api/jobs/:id/stream
   * SSE endpoint — streams job progress events via Redis pub/sub.
   */
  fastify.get("/api/jobs/:id/stream", async (req, reply) => {
    const { id } = req.params as { id: string };

    // Verify job exists
    const [job] = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, id));

    if (!job) {
      return reply.status(404).send({ error: "Job not found" });
    }

    // Hijack the connection for raw SSE streaming
    reply.hijack();
    const res = reply.raw;

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": process.env.FRONTEND_URL ?? "http://localhost:3000",
    });

    function sendEvent(data: Record<string, unknown>): void {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }

    // Send current job state immediately on connect
    sendEvent({
      type: "snapshot",
      status: job.status,
      pagesScraped: job.pagesScraped,
      postsFound: job.postsFound,
      commentsFound: job.commentsFound,
      error: job.error ?? null,
    });

    // If job is already terminal, close immediately
    if (["completed", "failed", "cancelled"].includes(job.status)) {
      res.end();
      return;
    }

    // Subscribe to Redis pub/sub channel for live updates
    const subscriber = new IORedis({
      host: redisConnection.host,
      port: redisConnection.port,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    const channel = `job-progress:${id}`;

    subscriber.on("message", (chan, message) => {
      if (chan !== channel) return;
      try {
        const event = JSON.parse(message);
        sendEvent(event);
        // Close stream when job reaches terminal state
        if (event.type === "completed" || event.type === "failed") {
          cleanup();
        }
      } catch {
        // Malformed message — ignore
      }
    });

    await subscriber.subscribe(channel);

    function cleanup(): void {
      subscriber.unsubscribe(channel).catch(() => {});
      subscriber.disconnect();
      res.end();
    }

    // Clean up when client disconnects
    res.on("close", cleanup);
    res.on("error", cleanup);
  });
}
