/**
 * BullMQ Worker — scrape queue.
 *
 * Job data: { jobId: string; subreddit: string; pagesTarget: number; resumeAfter?: string | null }
 *
 * Lifecycle:
 *   1. Mark DB job as 'running', set startedAt
 *   2. Run scrapeSubreddit() with a progress callback
 *   3. Progress callback: update DB + publish SSE event to Redis pub/sub
 *   4. On completion: mark 'completed', set completedAt
 *   5. On error: mark 'failed', persist error message
 */

import { Worker } from "bullmq";
import IORedis from "ioredis";
import { db, jobs } from "@reddit-intel/db";
import { eq } from "drizzle-orm";
import { redisConnection, parseRedisUrl } from "../lib/redis.js";
import { scrapeSubreddit } from "../lib/scraper.js";
import type { JobProgressEvent } from "../types.js";

// Dedicated Redis publisher — BullMQ's internal connection cannot be reused for pub/sub
const publisher = new IORedis({
  host: redisConnection.host,
  port: redisConnection.port,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

async function publish(channel: string, event: JobProgressEvent): Promise<void> {
  await publisher.publish(channel, JSON.stringify(event));
}

export const scraperWorker = new Worker(
  "scrape",
  async (job) => {
    const { jobId, subreddit, pagesTarget, resumeAfter } = job.data as {
      jobId: string;
      subreddit: string;
      pagesTarget: number;
      resumeAfter?: string | null;
    };

    const channel = `job-progress:${jobId}`;

    // 1. Mark job as running
    await db
      .update(jobs)
      .set({ status: "running", startedAt: new Date() })
      .where(eq(jobs.id, jobId));

    try {
      // 2. Run scraper with progress reporting
      const result = await scrapeSubreddit(
        subreddit,
        { pagesTarget, resumeAfter, jobId },
        async ({ pagesScraped, postsFound, commentsFound, lastAfter }) => {
          // 3a. Update DB
          await db
            .update(jobs)
            .set({
              pagesScraped,
              postsFound,
              commentsFound,
              ...(lastAfter != null ? { lastAfter } : {}),
            })
            .where(eq(jobs.id, jobId));

          // 3b. Publish SSE-compatible progress event
          await publish(channel, {
            type: "progress",
            pagesScraped,
            postsFound,
            commentsFound,
          });
        },
      );

      // 4. Mark completed
      await db
        .update(jobs)
        .set({
          status: "completed",
          completedAt: new Date(),
          pagesScraped: result.pagesScraped,
          postsFound: result.postsFound,
          commentsFound: result.commentsFound,
        })
        .where(eq(jobs.id, jobId));

      await publish(channel, {
        type: "completed",
        pagesScraped: result.pagesScraped,
        postsFound: result.postsFound,
        commentsFound: result.commentsFound,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[scraper.worker] Job ${jobId} failed:`, message);

      // 5. Mark failed
      await db
        .update(jobs)
        .set({ status: "failed", error: message })
        .where(eq(jobs.id, jobId));

      await publish(channel, {
        type: "failed",
        pagesScraped: 0,
        postsFound: 0,
        commentsFound: 0,
        error: message,
      });

      throw err; // Re-throw so BullMQ can handle retries/failure tracking
    }
  },
  {
    connection: redisConnection,
    concurrency: 1, // Playwright is heavy — run one scrape job at a time
    lockDuration: 60 * 60 * 1000, // 1 hour — scraping can take a long time
  },
);

scraperWorker.on("completed", (job) => {
  console.log(`[scraper.worker] Job ${job.id} completed successfully`);
});

scraperWorker.on("failed", (job, err) => {
  console.error(`[scraper.worker] Job ${job?.id} failed:`, err.message);
});

scraperWorker.on("error", (err) => {
  console.error("[scraper.worker] Worker error:", err);
});
