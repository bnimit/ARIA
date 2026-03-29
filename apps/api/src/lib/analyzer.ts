/**
 * Analyzer — two-pass LLM analysis of scraped Reddit data.
 *
 * Pass 1 (cheap model): batch every 25 posts → extract raw pain-point JSON
 * Pass 2 (smarter model): aggregate all batches → deduplicate, rank, annotate
 *
 * Supports three providers: anthropic, openai, gemini.
 *
 * Ported from src/analyzer.ts with the following changes:
 *   - Accepts apiKey + provider instead of reading from env
 *   - Loads posts+comments from PostgreSQL via @reddit-intel/db
 *   - Returns PainPoint[] (callers persist to analyses table)
 */

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { db, posts, comments } from "@reddit-intel/db";
import { eq, desc } from "drizzle-orm";
import type { PainPoint, PostWithComments, RedditPost, RedditComment } from "../types.js";

// ── Provider model map ────────────────────────────────────────────────────────

const MODELS = {
  anthropic: {
    batch:     "claude-haiku-4-5-20251001",
    aggregate: "claude-sonnet-4-6",
  },
  openai: {
    batch:     "gpt-4o-mini",
    aggregate: "gpt-4o",
  },
  gemini: {
    batch:     "gemini-1.5-flash",
    aggregate: "gemini-1.5-pro",
  },
} as const;

// ── Load posts + comments from PostgreSQL ─────────────────────────────────────

async function loadPostsWithComments(subredditId: string): Promise<PostWithComments[]> {
  // Load all posts for this subreddit
  const postRows = await db
    .select()
    .from(posts)
    .where(eq(posts.subredditId, subredditId))
    .orderBy(desc(posts.score));

  if (postRows.length === 0) return [];

  const postIds = postRows.map((p) => p.id);

  // Load all comments for these posts in one query
  const commentRows = await db
    .select()
    .from(comments)
    .where(
      // Use raw SQL for IN clause since Drizzle's inArray needs import
      // Using a loop of eq with OR would be verbose — use sql`` instead
      postIds.length === 1
        ? eq(comments.postId, postIds[0])
        : // drizzle-orm inArray
          (await import("drizzle-orm")).inArray(comments.postId, postIds),
    );

  // Group comments by postId
  const commentsByPostId = new Map<string, typeof commentRows>();
  for (const c of commentRows) {
    const existing = commentsByPostId.get(c.postId) ?? [];
    existing.push(c);
    commentsByPostId.set(c.postId, existing);
  }

  return postRows.map((p) => {
    const post: RedditPost = {
      id: p.redditId,
      subreddit: subredditId,
      title: p.title,
      body: p.body ?? null,
      author: p.author ?? "[deleted]",
      score: p.score,
      numComments: p.numComments,
      createdUtc: p.createdUtc,
      url: p.url,
      flair: p.flair ?? null,
      scrapedAt: p.scrapedAt.getTime(),
    };

    const postComments: RedditComment[] = (commentsByPostId.get(p.id) ?? []).map((c) => ({
      id: c.redditId,
      postId: p.redditId,
      parentId: c.parentRedditId ?? null,
      author: c.author ?? "[deleted]",
      body: c.body,
      score: c.score,
      depth: c.depth,
      scrapedAt: c.scrapedAt.getTime(),
    }));

    return { post, comments: postComments };
  });
}

// ── Batch text builder ────────────────────────────────────────────────────────

function buildBatchText(items: PostWithComments[]): string {
  return items
    .map(({ post, comments: postComments }) => {
      const topComments = postComments
        .filter((c) => c.score > 1 && c.body.length > 30 && c.author !== "[deleted]")
        .slice(0, 6)
        .map((c) => `  [+${c.score}] ${c.body.slice(0, 350).replace(/\n+/g, " ")}`)
        .join("\n");

      return [
        "---",
        `TITLE: ${post.title}`,
        post.body ? `BODY: ${post.body.slice(0, 600).replace(/\n+/g, " ")}` : "",
        topComments ? `COMMENTS:\n${topComments}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}

// ── Prompts ───────────────────────────────────────────────────────────────────

function batchPrompt(text: string, subreddit: string): string {
  return `
You are analyzing Reddit posts from r/${subreddit}.

Extract the recurring themes, pain points, frustrations, questions, and needs that community members express.
Look for: problems people complain about, things they wish existed, tools they find lacking,
processes that are painful, and requests for help or solutions.

Posts:
${text}

Return a JSON array only. Each item:
{ "theme": "short label", "description": "one sentence", "count": <occurrences in this batch>, "quote": "verbatim quote" }

Return [] if no clear themes found. No markdown, no explanation — just the array.
`.trim();
}

function aggregatePrompt(batchResults: string[], totalPosts: number, subreddit: string): string {
  return `
You have analyzed ${totalPosts} Reddit posts from r/${subreddit}.
Below are the themes and pain points identified across ${batchResults.length} batches.

${batchResults.map((r, i) => `--- Batch ${i + 1} ---\n${r}`).join("\n\n")}

Produce a final ranked list of the top 10 most significant recurring themes or pain points.
- Merge duplicate or overlapping themes
- Rank by total frequency (most common first)
- Keep quotes verbatim; pick the 2 most illustrative per theme
- If a theme has no clear quote, use an empty array for quotes

Return a JSON array only. Each item:
{
  "theme":              "short label (3-6 words)",
  "description":        "1-2 sentences describing the theme or problem",
  "frequency":          <total count across all batches>,
  "quotes":             ["verbatim quote 1", "verbatim quote 2"],
  "relevanceToProduct": "one sentence on what product or solution could address this"
}

No markdown, no explanation — just the array.
`.trim();
}

// ── LLM call helpers ──────────────────────────────────────────────────────────

async function callAnthropic(
  apiKey: string,
  model: string,
  prompt: string,
  maxTokens: number,
): Promise<string> {
  const client = new Anthropic({ apiKey });
  const msg = await client.messages.create({
    model,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  return msg.content[0].type === "text" ? msg.content[0].text : "[]";
}

async function callOpenAI(
  apiKey: string,
  model: string,
  prompt: string,
  maxTokens: number,
): Promise<string> {
  const client = new OpenAI({ apiKey });
  const resp = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  return resp.choices[0]?.message?.content ?? "[]";
}

async function callGemini(
  apiKey: string,
  model: string,
  prompt: string,
): Promise<string> {
  // Gemini via OpenAI-compatible endpoint
  const client = new OpenAI({
    apiKey,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
  });
  const resp = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
  });
  return resp.choices[0]?.message?.content ?? "[]";
}

async function callLLM(
  apiKey: string,
  provider: "anthropic" | "openai" | "gemini",
  model: string,
  prompt: string,
  maxTokens: number,
): Promise<string> {
  switch (provider) {
    case "anthropic":
      return callAnthropic(apiKey, model, prompt, maxTokens);
    case "openai":
      return callOpenAI(apiKey, model, prompt, maxTokens);
    case "gemini":
      return callGemini(apiKey, model, prompt);
  }
}

// ── Main entry ────────────────────────────────────────────────────────────────

export async function analyzePainPoints(
  subredditId: string,
  apiKey: string,
  provider: "anthropic" | "openai" | "gemini",
  subredditName: string = "unknown",
): Promise<PainPoint[]> {
  const all = await loadPostsWithComments(subredditId);

  if (all.length === 0) {
    console.log("No posts in database for this subreddit.");
    return [];
  }

  console.log(`\nAnalyzing ${all.length} posts in batches of 25 (provider: ${provider})…`);

  const BATCH_SIZE = 25;
  const batchModel = MODELS[provider].batch;
  const aggregateModel = MODELS[provider].aggregate;
  const batchResults: string[] = [];

  for (let i = 0; i < all.length; i += BATCH_SIZE) {
    const batch = all.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(all.length / BATCH_SIZE);
    process.stdout.write(`  Batch ${batchNum}/${totalBatches}… `);

    const result = await callLLM(
      apiKey,
      provider,
      batchModel,
      batchPrompt(buildBatchText(batch), subredditName),
      1500,
    );
    batchResults.push(result);
    process.stdout.write("done\n");

    // Small delay between API calls to avoid rate limiting
    if (i + BATCH_SIZE < all.length) {
      await new Promise<void>((r) => setTimeout(r, 800));
    }
  }

  console.log(`\nAggregating ${batchResults.length} batches with ${aggregateModel}…`);

  const finalRaw = await callLLM(
    apiKey,
    provider,
    aggregateModel,
    aggregatePrompt(batchResults, all.length, subredditName),
    4000,
  );

  const cleaned = finalRaw.replace(/```json\n?|\n?```/g, "").trim();

  try {
    return JSON.parse(cleaned) as PainPoint[];
  } catch {
    console.error("Failed to parse aggregated result:", finalRaw);
    return [];
  }
}
