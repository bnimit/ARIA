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
import type { PainPoint, AnalysisReport, PostWithComments, RedditPost, RedditComment } from "../types.js";

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

// ── Category taxonomy ────────────────────────────────────────────────────────

const CATEGORIES = [
  "lead_management",
  "follow_up",
  "time_management",
  "communication",
  "admin_overhead",
  "tool_frustration",
  "client_relations",
  "marketing",
  "transaction_management",
  "training_knowledge",
  "work_life_balance",
  "other",
] as const;

// ── Prompts ───────────────────────────────────────────────────────────────────

function batchPrompt(text: string, subreddit: string): string {
  return `You are a market intelligence analyst extracting structured pain points from Reddit community discussions.

Analyze these posts from r/${subreddit}. For each distinct pain point you identify, extract it using this exact JSON schema.

CATEGORY must be one of: ${CATEGORIES.join(" | ")}
SEVERITY levels:
- "acute": Immediate, time-sensitive problem causing real losses now
- "chronic": Ongoing frustration that people have accepted but still complain about
- "aspirational": A wish or desire for something better, not an active pain

EXAMPLE INPUT:
---
TITLE: I lost a $2M listing because I forgot to follow up
BODY: Was so busy last week with showings I forgot to call back a seller lead. Found out today they listed with another agent.
COMMENTS:
  [+45] This happens to me at least once a month. No CRM works the way I need it to.
  [+12] I set reminders but still miss things when I'm driving between showings all day.

EXAMPLE OUTPUT:
[
  {
    "theme": "Missed follow-ups cost deals",
    "category": "follow_up",
    "description": "Agents lose high-value listings because they cannot reliably track and execute timely follow-ups amid busy schedules",
    "severity": "acute",
    "count": 3,
    "quote": "I lost a $2M listing because I forgot to follow up",
    "tool_mentioned": null
  },
  {
    "theme": "CRM tools fail in practice",
    "category": "tool_frustration",
    "description": "Existing CRM tools do not fit real-world agent workflows, leading to abandonment and manual tracking",
    "severity": "chronic",
    "count": 2,
    "quote": "No CRM works the way I need it to",
    "tool_mentioned": "CRM (generic)"
  }
]

RULES:
- "description" must state the PROBLEM, not the topic. BAD: "Agents discuss CRM tools". GOOD: "Agents waste hours on CRM data entry that doesn't improve outcomes"
- "quote" must be VERBATIM from the post or comment text — do not paraphrase
- "tool_mentioned" — if a specific tool, app, or product is named (positively or negatively), capture its name; otherwise null
- Return [] if no clear pain points found

Posts to analyze:
${text}

Return ONLY the JSON array. No markdown fences, no explanation.`;
}

function aggregatePrompt(batchResults: string[], totalPosts: number, subreddit: string): string {
  return `You are synthesizing ${batchResults.length} batches of extracted pain points from ${totalPosts} Reddit posts in r/${subreddit} into a comprehensive intelligence report.

BATCH DATA:
${batchResults.map((r, i) => `--- Batch ${i + 1} ---\n${r}`).join("\n\n")}

Produce a JSON object with these exact keys:

{
  "executiveSummary": {
    "headline": "string — max 15 words, the single most important finding",
    "narrative": "string — max 150 words: what patterns emerged, what's most urgent, and what actions to consider",
    "sentimentDistribution": { "positive": 0.0-1.0, "neutral": 0.0-1.0, "negative": 0.0-1.0 },
    "confidence": 0.0-1.0,
    "signalPostRatio": "string — e.g. '87 of ${totalPosts} posts contained actionable signals'"
  },
  "painPoints": [
    {
      "theme": "short label (3-6 words)",
      "category": "one of: ${CATEGORIES.join(" | ")}",
      "description": "1-2 sentences describing the PROBLEM (not the topic)",
      "frequency": <total count across all batches>,
      "severity": "acute | chronic | aspirational",
      "sentiment": "negative | mixed | neutral",
      "quotes": ["verbatim quote 1", "verbatim quote 2"],
      "relevanceToProduct": "one sentence on what product or solution could address this"
    }
  ],
  "emergingThemes": [
    {
      "theme": "string",
      "description": "string — why this is notable or new",
      "signalStrength": "strong | moderate | weak",
      "quote": "verbatim quote"
    }
  ],
  "competitiveMentions": [
    {
      "name": "product or tool name",
      "sentiment": "positive | negative | mixed",
      "context": "one sentence on how/why it was mentioned",
      "frequency": <mention count>
    }
  ],
  "actionableOpportunities": [
    {
      "opportunity": "specific product/feature opportunity supported by the data",
      "evidence": "what data supports this — cite frequency and quotes",
      "impact": "high | medium | low",
      "effort": "high | medium | low"
    }
  ]
}

RULES:
- painPoints: max 10, ranked by frequency (most common first). Merge duplicates/overlapping themes. Quotes must be VERBATIM from batch data
- emergingThemes: max 5, themes that appear novel or are growing — things a product team should watch
- competitiveMentions: all tools/products mentioned in batch data with sentiment. Omit if none found (empty array)
- actionableOpportunities: max 5, ranked by impact. Each must cite specific evidence from the data
- All quotes must be VERBATIM from the batch data. Do not paraphrase

Return ONLY the JSON object. No markdown fences, no explanation.`;
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

const EMPTY_REPORT: AnalysisReport = {
  executiveSummary: {
    headline: "No data available",
    narrative: "No posts were found to analyze.",
    sentimentDistribution: { positive: 0, neutral: 1, negative: 0 },
    confidence: 0,
    signalPostRatio: "0 of 0 posts contained actionable signals",
  },
  painPoints: [],
  emergingThemes: [],
  competitiveMentions: [],
  actionableOpportunities: [],
};

export async function analyzePainPoints(
  subredditId: string,
  apiKey: string,
  provider: "anthropic" | "openai" | "gemini",
  subredditName: string = "unknown",
): Promise<AnalysisReport> {
  const all = await loadPostsWithComments(subredditId);

  if (all.length === 0) {
    console.log("No posts in database for this subreddit.");
    return EMPTY_REPORT;
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
      2000,
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
    8000,
  );

  const cleaned = finalRaw.replace(/```json\n?|\n?```/g, "").trim();

  try {
    const parsed = JSON.parse(cleaned) as AnalysisReport;

    // Validate and normalize the structure
    if (!parsed.executiveSummary || !parsed.painPoints) {
      // If the LLM returned a flat array (backward compat), wrap it
      if (Array.isArray(parsed)) {
        return {
          ...EMPTY_REPORT,
          painPoints: parsed as unknown as PainPoint[],
        };
      }
      console.error("Unexpected report structure, returning as-is with defaults");
      return { ...EMPTY_REPORT, ...parsed };
    }

    return parsed;
  } catch {
    console.error("Failed to parse aggregated result:", finalRaw);
    return EMPTY_REPORT;
  }
}
