/**
 * Scraper — targets old.reddit.com exclusively.
 *
 * Why old.reddit.com?
 *   - Server-side rendered plain HTML (no JS required)
 *   - Stable DOM selectors that haven't changed in years
 *   - Far lighter on bandwidth and render time vs the React SPA
 *   - Less aggressive anti-bot instrumentation than new Reddit
 *
 * Ported from src/scraper.ts with the following changes:
 *   - Accepts a `jobId` and `onProgress` callback instead of reading from SQLite
 *   - Saves posts/comments to PostgreSQL via @reddit-intel/db
 *   - `scrapeAll` removed — the BullMQ worker handles job orchestration
 */

import type { Browser, BrowserContext, Page } from "playwright";
import { createBrowser, createContext, humanDelay, humanScroll, randomInt } from "./browser.js";
import { db, posts, comments, subreddits } from "@reddit-intel/db";
import { eq, sql } from "drizzle-orm";
import type { RedditPost, RedditComment } from "../types.js";

// ── Config ─────────────────────────────────────────────────────────────────────

const CONFIG = {
  baseUrl: "https://old.reddit.com",
  delayBetweenPages: { min: 5000, max: 10000 },
  delayBetweenPosts: { min: 2000, max: 5000 },
  maxCommentsPerPost: 100,
  lookbackDays: 180,
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function cutoffEpoch(): number {
  return Math.floor(Date.now() / 1000) - CONFIG.lookbackDays * 86400;
}

function safeInt(s: string | null | undefined, fallback = 0): number {
  if (!s) return fallback;
  const n = parseInt(s.replace(/[^0-9-]/g, ""), 10);
  return isNaN(n) ? fallback : n;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type ProgressCallback = (data: {
  pagesScraped: number;
  postsFound: number;
  commentsFound: number;
  lastAfter: string | null;
}) => Promise<void>;

interface ListingResult {
  posts: RedditPost[];
  nextUrl: string | null;
}

interface PostDetail {
  body: string | null;
  comments: RedditComment[];
}

// ── Listing page scrape ───────────────────────────────────────────────────────

async function scrapeListingPage(
  page: Page,
  subreddit: string,
  url: string,
): Promise<ListingResult> {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await humanDelay(800, 1800);
  await humanScroll(page);

  // Extract all post data + next URL in a single atomic $$eval — avoids
  // "execution context was destroyed" errors that occur when ElementHandles
  // are held across async ticks and the page re-renders or navigates.
  const { rawPosts, nextUrl } = await page.$$eval(
    ".thing[data-fullname^='t3_']:not(.promoted)",
    (elements) => {
      const items = elements.map((el) => {
        const fullname = el.getAttribute("data-fullname") ?? "";
        const titleEl = el.querySelector("a.title") as HTMLAnchorElement | null;
        const scoreAttr = el.getAttribute("data-score");
        const scoreEl  = el.querySelector(".score.unvoted");
        const commentEl = el.querySelector("a.comments");
        const authorEl  = el.querySelector("a.author");
        const flairEl   = el.querySelector(".linkflairlabel");
        const timeEl    = el.querySelector("time[datetime]") as HTMLTimeElement | null;

        return {
          fullname,
          title:    titleEl?.textContent?.trim() ?? "",
          href:     titleEl?.href ?? "",
          score:    scoreAttr ?? scoreEl?.textContent?.trim() ?? "0",
          comments: commentEl?.textContent?.trim() ?? "0",
          author:   authorEl?.textContent?.trim() ?? "[deleted]",
          flair:    flairEl?.textContent?.trim() ?? null,
          datetime: timeEl?.getAttribute("datetime") ?? null,
        };
      });

      const nextAnchor = document.querySelector("a[rel~='next']") as HTMLAnchorElement | null;
      return { rawPosts: items, nextUrl: nextAnchor?.href ?? null };
    },
  ).catch(() => ({ rawPosts: [] as Array<{
    fullname: string; title: string; href: string; score: string;
    comments: string; author: string; flair: string | null; datetime: string | null;
  }>, nextUrl: null as string | null }));

  const result: RedditPost[] = [];
  const cutoff = cutoffEpoch();

  for (const raw of rawPosts) {
    if (!raw.fullname || !raw.title) continue;
    const id = raw.fullname.slice(3); // strip "t3_"

    const createdUtc = raw.datetime
      ? Math.floor(new Date(raw.datetime).getTime() / 1000)
      : 0;

    // Stop paginating if we've hit posts older than the lookback window
    if (createdUtc > 0 && createdUtc < cutoff) {
      return { posts: result, nextUrl: null };
    }

    result.push({
      id,
      subreddit,
      title: raw.title,
      body: null,
      author: raw.author,
      score: safeInt(raw.score),
      numComments: safeInt(raw.comments.split(" ")[0]),
      createdUtc: createdUtc || Math.floor(Date.now() / 1000),
      url: (raw.href || `https://old.reddit.com/r/${subreddit}/comments/${id}/`)
        .replace("www.reddit.com", "old.reddit.com"),
      flair: raw.flair,
      scrapedAt: Date.now(),
    });
  }

  return { posts: result, nextUrl };
}

// ── Post detail (body + comments) ────────────────────────────────────────────

async function scrapePostDetail(page: Page, post: RedditPost): Promise<PostDetail> {
  // Always use old.reddit.com for the detail page too
  const url = post.url
    .replace("www.reddit.com", "old.reddit.com")
    .replace(/^https:\/\/reddit\.com/, "https://old.reddit.com");

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  } catch {
    return { body: null, comments: [] };
  }

  await humanDelay(600, 1400);

  // Post body (selftext only — link posts have no body)
  const body = await page
    .$eval(".expando .usertext-body .md", (el) => el.textContent?.trim() ?? null)
    .catch(() => null);

  // Extract all comment data in one atomic $$eval to avoid stale ElementHandle
  // errors if the page updates between individual async attribute reads.
  const maxComments = CONFIG.maxCommentsPerPost;
  const rawComments = await page.$$eval(
    ".comment[data-fullname^='t1_']",
    (elements, max) => elements.slice(0, max).map((el) => {
      const entryEl  = el.querySelector(":scope > .entry");
      const authorEl = entryEl?.querySelector(".author");
      const bodyEl   = entryEl?.querySelector(".usertext-body .md");
      const scoreEl  = entryEl?.querySelector(".score.unvoted");
      const parentFullname = el.getAttribute("data-parent-id") ?? null;

      return {
        fullname:       el.getAttribute("data-fullname") ?? "",
        parentFullname,
        author:         authorEl?.textContent?.trim() ?? "[deleted]",
        body:           bodyEl?.textContent?.trim() ?? "",
        score:          scoreEl?.textContent?.trim() ?? "0",
        depth:          el.getAttribute("data-indent") ?? "0",
      };
    }),
    maxComments,
  ).catch(() => [] as Array<{
    fullname: string; parentFullname: string | null;
    author: string; body: string; score: string; depth: string;
  }>);

  const commentList: RedditComment[] = [];
  for (const raw of rawComments) {
    if (!raw.fullname) continue;
    if (!raw.body || raw.body === "[deleted]" || raw.body === "[removed]") continue;
    const id = raw.fullname.slice(3);
    const parentId = raw.parentFullname?.startsWith("t1_")
      ? raw.parentFullname.slice(3)
      : null;
    commentList.push({
      id,
      postId: post.id,
      parentId,
      author: raw.author,
      body: raw.body,
      score: safeInt(raw.score),
      depth: safeInt(raw.depth),
      scrapedAt: Date.now(),
    });
  }

  return { body, comments: commentList };
}

// ── DB persistence helpers ────────────────────────────────────────────────────

async function upsertPost(
  post: RedditPost,
  subredditId: string,
  jobId: string,
): Promise<string> {
  // ON CONFLICT (reddit_id, subreddit_id) DO UPDATE — keep latest scores
  const [row] = await db
    .insert(posts)
    .values({
      redditId: post.id,
      subredditId,
      jobId,
      title: post.title,
      body: post.body,
      author: post.author,
      score: post.score,
      numComments: post.numComments,
      flair: post.flair,
      url: post.url,
      createdUtc: post.createdUtc,
    })
    .onConflictDoUpdate({
      target: [posts.redditId, posts.subredditId],
      set: {
        score: sql`excluded.score`,
        numComments: sql`excluded.num_comments`,
        scrapedAt: sql`NOW()`,
      },
    })
    .returning({ id: posts.id });

  return row.id;
}

async function upsertComments(
  commentList: RedditComment[],
  dbPostId: string,
): Promise<void> {
  if (commentList.length === 0) return;

  await db
    .insert(comments)
    .values(
      commentList.map((c) => ({
        redditId: c.id,
        postId: dbPostId,
        parentRedditId: c.parentId,
        author: c.author,
        body: c.body,
        score: c.score,
        depth: c.depth,
      })),
    )
    .onConflictDoNothing();
}

// ── Subreddit scrape orchestrator ─────────────────────────────────────────────

export async function scrapeSubreddit(
  subredditName: string,
  options: {
    pagesTarget?: number;
    resumeAfter?: string | null;
    jobId?: string;
  } = {},
  onProgress?: ProgressCallback,
): Promise<{ pagesScraped: number; postsFound: number; commentsFound: number }> {
  const pagesTarget = options.pagesTarget ?? 8;
  const jobId = options.jobId ?? "";

  // Resolve or create the subreddit record
  let [subredditRow] = await db
    .select({ id: subreddits.id })
    .from(subreddits)
    .where(eq(subreddits.name, subredditName));

  if (!subredditRow) {
    const [inserted] = await db
      .insert(subreddits)
      .values({ name: subredditName })
      .returning({ id: subreddits.id });
    subredditRow = inserted;
  }

  const subredditId = subredditRow.id;

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;

  let pagesScraped = 0;
  let postsFound = 0;
  let commentsFound = 0;

  try {
    browser = await createBrowser();
    context = await createContext(browser);

    // Two pages: one for listing, one for post details — avoids navigation
    // clobbering the listing mid-pagination
    const listPage   = await context.newPage();
    const detailPage = await context.newPage();

    let currentUrl = options.resumeAfter
      ? `${CONFIG.baseUrl}/r/${subredditName}/?after=${options.resumeAfter}`
      : `${CONFIG.baseUrl}/r/${subredditName}/`;

    console.log(`\n  r/${subredditName} — starting scrape (target: ${pagesTarget} pages)`);
    if (options.resumeAfter) {
      console.log(`  Resuming from cursor: ${options.resumeAfter}`);
    }

    while (pagesScraped < pagesTarget) {
      console.log(`\n  Page ${pagesScraped + 1}/${pagesTarget}`);

      const { posts: pagePosts, nextUrl } = await scrapeListingPage(
        listPage,
        subredditName,
        currentUrl,
      );

      if (pagePosts.length === 0) {
        console.log("  No posts found — stopping.");
        break;
      }

      console.log(`  Found ${pagePosts.length} posts`);

      for (let i = 0; i < pagePosts.length; i++) {
        const post = pagePosts[i];
        const label = `"${post.title.slice(0, 55)}${post.title.length > 55 ? "…" : ""}"`;

        if (post.numComments > 0) {
          process.stdout.write(`    [${i + 1}/${pagePosts.length}] ${label}  `);
          const { body, comments: postComments } = await scrapePostDetail(detailPage, post);
          post.body = body;
          const dbPostId = await upsertPost(post, subredditId, jobId);
          await upsertComments(postComments, dbPostId);
          commentsFound += postComments.length;
          process.stdout.write(`→ ${postComments.length} comments\n`);
          await humanDelay(CONFIG.delayBetweenPosts.min, CONFIG.delayBetweenPosts.max);
        } else {
          console.log(`    [${i + 1}/${pagePosts.length}] ${label}  → (no comments)`);
          await upsertPost(post, subredditId, jobId);
        }

        postsFound++;
      }

      pagesScraped++;

      // Save cursor — the `after` param for the next page is the fullname of
      // the last post on the current page
      const lastPostId = pagePosts.at(-1)?.id ?? null;
      const lastAfter = lastPostId ? `t3_${lastPostId}` : null;

      // Emit progress update
      if (onProgress) {
        await onProgress({ pagesScraped, postsFound, commentsFound, lastAfter });
      }

      if (!nextUrl) {
        console.log("\n  No next page — end of subreddit.");
        break;
      }

      currentUrl = nextUrl;
      console.log(`\n  Cooling down before next page…`);
      await humanDelay(CONFIG.delayBetweenPages.min, CONFIG.delayBetweenPages.max);
    }

    console.log(`\n  r/${subredditName} complete (${pagesScraped} pages, ${postsFound} posts, ${commentsFound} comments)`);
    return { pagesScraped, postsFound, commentsFound };
  } finally {
    await context?.close();
    await browser?.close();
  }
}
