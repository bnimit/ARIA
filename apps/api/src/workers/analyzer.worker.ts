/**
 * BullMQ Worker — analyze queue.
 *
 * Job data: { subredditId: string; subreddit: string; apiKey: string; provider: string }
 *
 * Lifecycle:
 *   1. Call analyzePainPoints() to get PainPoint[]
 *   2. Persist result to analyses table in DB
 *   3. On error: log (no DB status to update for analyses)
 */

import { Worker } from "bullmq";
import { db, analyses, posts, comments } from "@reddit-intel/db";
import { eq, count } from "drizzle-orm";
import { redisConnection } from "../lib/redis.js";
import { analyzePainPoints } from "../lib/analyzer.js";
export const analyzerWorker = new Worker(
  "analyze",
  async (job) => {
    const { subredditId, subreddit, apiKey, provider } = job.data as {
      subredditId: string;
      subreddit: string;
      apiKey: string;
      provider: "anthropic" | "openai" | "gemini";
    };

    console.log(`[analyzer.worker] Starting analysis for r/${subreddit} (provider: ${provider})`);

    try {
      // 1. Run analysis
      const painPoints = await analyzePainPoints(subredditId, apiKey, provider, subreddit);

      if (painPoints.length === 0) {
        console.log(`[analyzer.worker] No pain points extracted for r/${subreddit}`);
        return;
      }

      // 2. Count posts and comments for this subreddit to store in the analysis record
      const [postCountRow] = await db
        .select({ total: count() })
        .from(posts)
        .where(eq(posts.subredditId, subredditId));

      const postIds = (
        await db
          .select({ id: posts.id })
          .from(posts)
          .where(eq(posts.subredditId, subredditId))
      ).map((r) => r.id);

      let commentTotal = 0;
      if (postIds.length > 0) {
        const { inArray } = await import("drizzle-orm");
        const [commentCountRow] = await db
          .select({ total: count() })
          .from(comments)
          .where(inArray(comments.postId, postIds));
        commentTotal = commentCountRow?.total ?? 0;
      }

      const totalPosts = postCountRow?.total ?? 0;

      // Determine model label to store
      const modelLabel = getModelLabel(provider);

      // 3. Persist to analyses table
      await db.insert(analyses).values({
        subredditId,
        model: modelLabel,
        totalPosts,
        totalComments: commentTotal,
        painPoints: painPoints as any,
      });

      console.log(
        `[analyzer.worker] Analysis saved for r/${subreddit} — ${painPoints.length} pain points, ${totalPosts} posts analyzed`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[analyzer.worker] Analysis failed for r/${subreddit}:`, message);
      throw err;
    }
  },
  {
    connection: redisConnection,
    concurrency: 2, // LLM calls are I/O-bound — allow some parallelism
    lockDuration: 30 * 60 * 1000, // 30 minutes
  },
);

function getModelLabel(provider: "anthropic" | "openai" | "gemini"): string {
  const labels: Record<string, string> = {
    anthropic: "claude-sonnet-4-6",
    openai: "gpt-4o",
    gemini: "gemini-1.5-pro",
  };
  return labels[provider] ?? provider;
}

analyzerWorker.on("completed", (job) => {
  console.log(`[analyzer.worker] Job ${job.id} completed successfully`);
});

analyzerWorker.on("failed", (job, err) => {
  console.error(`[analyzer.worker] Job ${job?.id} failed:`, err.message);
});

analyzerWorker.on("error", (err) => {
  console.error("[analyzer.worker] Worker error:", err);
});
