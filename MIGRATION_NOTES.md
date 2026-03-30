# Migration Notes — Old src/ → New apps/api/

These notes summarize what the legacy `src/` files do so the new backend subagent
can port the logic into `apps/api/src/` without re-reading every file from scratch.

---

## File Summaries

### `config.ts`
Defines three exports used everywhere:

- **`TARGETS`** — the three subreddit slugs to scrape: `["realtors", "realestateagents", "REAgents"]`
- **`CONFIG`** — runtime tuning constants:
  - `baseUrl`: `"https://old.reddit.com"`
  - `postsPerSubreddit`: 200 (≈8 pages of 25)
  - `delayBetweenPages`: 5 000–10 000 ms
  - `delayBetweenPosts`: 2 000–5 000 ms
  - `delayBetweenBatches`: 1 500–3 000 ms
  - `maxCommentsPerPost`: 100
  - `lookbackDays`: 180 (ignore posts older than 6 months)
- **`USER_AGENTS`** — 5 real macOS Chrome/Safari UA strings used to rotate per-context:
  1. `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ... Chrome/122.0.0.0 Safari/537.36`
  2. `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ... Chrome/121.0.0.0 Safari/537.36`
  3. `Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3_1) AppleWebKit/537.36 ... Chrome/122.0.0.0 Safari/537.36`
  4. `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 ... Version/17.3.1 Safari/605.1.15`
  5. `Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 ... Version/17.4.1 Safari/605.1.15`

### `types.ts`
Pure TypeScript interfaces — no logic. Key shapes:

- **`RedditPost`**: `{ id, subreddit, title, body: string|null, author, score, numComments, createdUtc, url, flair: string|null, scrapedAt }`
- **`RedditComment`**: `{ id, postId, parentId: string|null, author, body, score, depth, scrapedAt }`
- **`ScrapeProgress`**: `{ subreddit, lastAfter: string|null, pagesScraped, lastScrapedAt }`
- **`PostWithComments`**: `{ post: RedditPost, comments: RedditComment[] }`
- **`PainPoint`**: `{ theme, category, description, frequency, severity, sentiment, quotes: string[], relevanceToProduct }`
- **`AnalysisReport`**: `{ executiveSummary, painPoints: PainPoint[], emergingThemes, competitiveMentions, actionableOpportunities }`

### `browser.ts`
Playwright browser factory with anti-detection hardening:

- `createBrowser()` — launches headless Chromium with `--disable-blink-features=AutomationControlled`, `--no-sandbox`, `--disable-dev-shm-usage`, etc.
- `createContext(browser)` — picks a random UA + randomised viewport (1280–1920 × 800–1080), sets locale `en-US` / timezone `America/New_York`, injects an `addInitScript` that:
  1. Sets `navigator.webdriver = undefined`
  2. Spoofs `navigator.plugins` (5 fake entries)
  3. Locks `navigator.languages = ['en-US', 'en']`
  4. Restores `window.chrome` (headless strips it)
  5. Patches `navigator.permissions.query` to return realistic notification state
- `humanDelay(min, max)` — `setTimeout` jitter helper (ms)
- `humanScroll(page)` — 2–4 `window.scrollBy` calls (150–550 px) with 250–700 ms pauses

### `scraper.ts`
Core scraping logic targeting `old.reddit.com` exclusively (SSR HTML, stable selectors).

**Key DOM selectors for old.reddit.com listing pages:**

| What | Selector |
|------|----------|
| Post container | `.thing[data-fullname^='t3_']:not(.promoted)` |
| Post ID | `data-fullname` attribute (strip `t3_` prefix) |
| Post title + URL | `a.title` — `.textContent` for title, `.href` for URL |
| Score (preferred) | `data-score` attribute on the `.thing` |
| Score (fallback) | `.score.unvoted` text |
| Comment count | `a.comments` text (split on space, take first token) |
| Author | `a.author` text |
| Flair | `.linkflairlabel` text |
| Timestamp | `time[datetime]` — parse ISO 8601 `datetime` attribute → Unix epoch |
| Next-page cursor | `a[rel~='next']` href (note: `~=` contains-word, not `=` exact match — old Reddit uses space-separated rel values) |

**Key DOM selectors for old.reddit.com post detail pages:**

| What | Selector |
|------|----------|
| Post body (selftext) | `.expando .usertext-body .md` text |
| Comment container | `.comment[data-fullname^='t1_']` |
| Comment ID | `data-fullname` (strip `t1_`) |
| Parent ID | `data-parent-id` — keep only if starts with `t1_` (discard `t3_` parent = top-level) |
| Comment author | `:scope > .entry .author` |
| Comment body | `:scope > .entry .usertext-body .md` (`:scope >` prevents picking up nested children) |
| Comment score | `:scope > .entry .score.unvoted` |
| Comment depth | `data-indent` attribute |

**Pagination:** Uses `?after=t3_<lastPostId>` cursor appended to subreddit URL. Progress is saved after every listing page (resumable across restarts).

**Cutoff:** Posts older than `CONFIG.lookbackDays` days (180) terminate pagination early.

**Two-page strategy:** Scraper opens two Playwright pages per context — one for the listing, one for post detail — to avoid navigation clobbering the listing mid-loop.

### `storage.ts`
SQLite persistence via `bun:sqlite`. Database at `./data/reddit.db`. WAL mode enabled.

Schema:
- `posts(id PK, subreddit, title, body, author, score, num_comments, created_utc, url, flair, scraped_at)`
- `comments(id PK, post_id FK, parent_id, author, body, score, depth, scraped_at)`
- `scrape_progress(subreddit PK, last_after, pages_scraped, last_scraped_at)`

Indexes on `posts(subreddit)`, `posts(score DESC)`, `comments(post_id)`, `comments(score DESC)`.

Key functions: `upsertPost`, `upsertComment`, `getProgress`, `updateProgress`, `getAllPostsWithComments`, `getStats`.

`getAllPostsWithComments` fetches posts ordered by score DESC, then for each post fetches up to 20 comments ordered by score DESC. Returns `PostWithComments[]`.

### `analyzer.ts`
Two-pass LLM analysis pipeline (supports Anthropic, OpenAI, Gemini):

**Pass 1 — Batch extraction (fast model):**
- Batches all posts in groups of 25
- Builds a text block per batch: each post formatted as `TITLE: ... / BODY: ... / COMMENTS: [+score] text...`
- Comment filter: `score > 1 && body.length > 30 && author !== "[deleted]"` — top 6 per post, each truncated to 350 chars
- Post body truncated to 600 chars
- Model: Haiku / GPT-4o-mini / Gemini Flash, max_tokens 2000
- Prompt uses 2-shot examples, constrained 12-value category enum, severity (acute/chronic/aspirational), and tool mention extraction
- Returns JSON array: `{ theme, category, description, severity, count, quote, tool_mentioned }`

**Pass 2 — Aggregation (smarter model):**
- Feeds all batch results to Sonnet / GPT-4o / Gemini Pro, max_tokens 8000
- Produces a full `AnalysisReport` with: executive summary (headline, narrative, sentiment distribution, confidence), merged/ranked pain points, emerging themes, competitive mentions, and actionable opportunities
- Strips markdown fences before `JSON.parse`; falls back gracefully if LLM returns a flat array

**`toPushPayload` equivalent** — the `buildBatchText` function is the closest analog. It maps `PostWithComments[]` to a single string:
```
---
TITLE: <post.title>
BODY: <post.body.slice(0, 600), newlines collapsed>
COMMENTS:
  [+score] <comment.body.slice(0, 350), newlines collapsed>
  ...
```
This string is embedded directly in the Haiku batch prompt. The new API should replicate this exact formatting if it wants consistent model behavior.

### `report.ts`
Writes analysis output to `./reports/`:
- `pain-points-<timestamp>.md` — Markdown report with stats header, ranked pain-point cards, blockquotes, ARCA relevance annotations
- `pain-points-<timestamp>.json` — Raw `PainPoint[]` JSON

`loadLatestReport()` in `web.ts` reads the most recent `.json` file by sorting filenames (they're timestamped, so lexicographic sort works).

### `web.ts`
Bun HTTP server on port 4242. No framework — server-side HTML string rendering. Reads live from SQLite.

Routes:
- `GET /` — full analytics dashboard (pain cards, word cloud, top posts, subreddit bar chart)
- `GET /report` — print-optimised single-page report (source for PDF export)
- `GET /api/export/pdf` — launches headless Chromium, prints `/report` to PDF (A4, 20/16mm margins)
- `GET /api/pain-points` — returns latest `PainPoint[]` JSON
- `GET /api/stats` — returns `{ posts, comments, subreddits }` JSON

Word cloud: filters stop words, counts `\b[a-z]{4,}\b` tokens across all post titles + bodies + comments, returns top 35.

### `index.ts`
CLI entry point. Commands: `scrape [subreddit]`, `analyze`, `serve`, `stats`, `reset`.

---

## What the New Backend Needs to Know

1. **Subreddit targets** are `realtors`, `realestateagents`, `REAgents` — update `TARGETS` in the new config if scope changes.
2. **old.reddit.com selectors are stable** — the selector table above is battle-tested. New Reddit's React SPA selectors are completely different and far less reliable.
3. **Pagination cursor format**: `?after=t3_<id>` — the `t3_` prefix is Reddit's fullname prefix for link posts; it must be included in the `after` param.
4. **Score attribute vs text**: Always prefer `data-score` attribute over `.score.unvoted` text — the text can show "•" (hot) instead of a number.
5. **Comment scoping**: Use `:scope > .entry ...` selectors to avoid picking up text from nested child comments in the same DOM subtree.
6. **Anti-detection init script**: The five `Object.defineProperty` patches in `browser.ts` are important — old Reddit does fingerprint headless browsers and will serve a CAPTCHA or redirect without them.
7. **Analyzer prompt wording** is tuned — the explicit exclusion of "market conditions, economic factors, or complaints about clients" is load-bearing for relevance. Keep it if porting the prompt.
8. **Model IDs in use**: `claude-haiku-4-5-20251001` (batch pass), `claude-sonnet-4-6` (aggregation pass).
9. **DB schema column names** use snake_case (`num_comments`, `created_utc`, `scraped_at`, `post_id`, `parent_id`) — map to camelCase in the TypeScript layer exactly as `storage.ts` does.
10. **Resume mechanism**: `scrape_progress.last_after` stores `t3_<id>` of the last post on the last scraped page; on resume, start URL becomes `baseUrl/r/<sub>/?after=<last_after>`.
