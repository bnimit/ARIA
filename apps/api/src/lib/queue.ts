import { Queue } from "bullmq";
import { redisConnection } from "./redis.js";

/**
 * scrapeQueue — jobs that run the Playwright Reddit scraper.
 * Data shape: { jobId: string; subreddit: string; pagesTarget: number; resumeAfter?: string | null }
 */
export const scrapeQueue = new Queue("scrape", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

/**
 * analyzeQueue — jobs that call the LLM analyzer after scraping.
 * Data shape: { subredditId: string; subreddit: string; apiKey: string; provider: string }
 */
export const analyzeQueue = new Queue("analyze", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 3000 },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 25 },
  },
});
