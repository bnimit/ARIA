# ARIA — Reddit Intelligence Platform

> Scrape any subreddit, extract user pain points with AI, and turn raw Reddit discussions into structured product insights.

ARIA combines a human-behaviour-mimicking web scraper with a two-pass LLM analysis pipeline. Point it at any subreddit, kick off a scrape job, then trigger an AI analysis — you get back a full intelligence report: executive briefing, ranked pain points with severity and category tags, emerging signals, competitive landscape, and actionable opportunities.

---

## Features

- **Human-like scraper** — Playwright + Chromium targets `old.reddit.com` (plain HTML, no JS required). Rotates user-agents, randomises viewport, spoofs `navigator.webdriver`, and injects random scroll/delay behaviour to avoid bot detection.
- **Live job progress** — SSE stream delivers real-time page/post/comment counts to the UI as scraping runs.
- **Two-pass AI analysis** — Pass 1 uses a cheap fast model (Haiku / GPT-4o-mini / Gemini Flash) to batch-extract pain points with 2-shot prompting, constrained category taxonomy, and severity classification. Pass 2 uses a smarter model (Sonnet / GPT-4o / Gemini Pro) to produce a full intelligence report: executive summary, ranked pain points, emerging signals, competitive landscape, and actionable opportunities.
- **Multi-provider LLMs** — Anthropic, OpenAI, and Gemini supported; switch per-analysis from the UI.
- **Auth** — Email/password signup (argon2id via Bun), JWT sessions, forgot/reset password flow.
- **Rich analysis dashboard** — Executive briefing with sentiment bars and confidence indicators, severity-coded pain point cards, emerging signal grid, competitive mention table, and impact/effort opportunity cards. PDF export includes all sections.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 App Router, Nunito + DM Mono fonts |
| API | Fastify v5, Bun runtime, `@fastify/jwt` |
| Queue | BullMQ + Redis 7 |
| Database | PostgreSQL 16, Drizzle ORM |
| Scraper | Playwright (Chromium headless) |
| AI | Anthropic Claude, OpenAI, Google Gemini |
| Infrastructure | Docker Compose (Postgres + Redis) |

---

## Project Structure

```
aria/
├── apps/
│   ├── api/          # Fastify API + BullMQ workers
│   │   └── src/
│   │       ├── lib/          # scraper.ts, browser.ts, analyzer.ts, queue.ts
│   │       ├── routes/       # auth, subreddits, jobs, analyses, settings
│   │       └── workers/      # scraper.worker.ts, analyzer.worker.ts
│   └── web/          # Next.js frontend
│       └── src/
│           ├── app/          # App Router pages
│           ├── components/   # layout, dashboard, auth, ui
│           └── lib/          # api.ts, auth.ts, hooks.ts
├── packages/
│   └── db/           # Drizzle schema + migrations
├── docker-compose.yml
└── turbo.json
```

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.1+
- [Docker](https://docs.docker.com/get-docker/) (for Postgres + Redis)
- An API key from at least one of: [Anthropic](https://console.anthropic.com), [OpenAI](https://platform.openai.com), or [Google AI Studio](https://aistudio.google.com)

### 1. Clone

```bash
git clone git@github.com:bnimit/ARIA.git
cd ARIA
```

### 2. Install dependencies

```bash
bun install
```

### 3. Configure environment (optional for local dev)

No `.env` file is required for local development. Every variable has a hardcoded fallback that matches the `docker-compose.yml` defaults, so the app runs out of the box.

The only case where you need a `.env` is **production**, where you should set:

```env
JWT_SECRET=<output of: openssl rand -hex 32>
```

AI provider keys (Anthropic, OpenAI, Gemini) are **not** read from environment variables. They are entered through the **Settings** page in the UI after signing up and stored in the database.

### 4. Start infrastructure

```bash
docker compose up -d
```

This starts PostgreSQL 16 (port 5435) and Redis 7 (port 6381).

### 5. Run database migrations

```bash
bun db:migrate
```

### 6. Start the dev servers

```bash
bun run dev
```

| Service | URL |
|---|---|
| Web UI | http://localhost:3000 |
| API | http://localhost:3001 |

### 7. Create your account

Navigate to http://localhost:3000/auth/signup and create an account. ARIA is single-tenant — only one admin account can be created per instance.

---

## Usage

### Scraping a subreddit

1. Go to **Communities** → **Add community**
2. Enter a subreddit name (e.g. `webdev`)
3. Open the community page and click **Start scrape**
4. Choose the number of pages (each page = ~25 posts + all their comments)
5. Watch live progress in the UI via the SSE stream

### Running an AI analysis

1. After a scrape completes, click **Analyze** on the community page
2. Select an AI provider (Anthropic / OpenAI / Gemini)
3. ARIA runs a two-pass analysis:
   - **Pass 1** — batches every 25 posts through a fast model with 2-shot examples to extract pain points with categories (12-value taxonomy), severity (acute/chronic/aspirational), and competitive tool mentions
   - **Pass 2** — aggregates all batches through a smarter model to produce a full intelligence report: executive briefing, merged and ranked pain points, emerging signals, competitive landscape, and actionable product opportunities
4. Results appear as a structured report: executive summary with sentiment distribution at top, severity-coded pain point cards, emerging signal grid, competitive landscape table, and impact/effort opportunity cards

### Settings

Add or update AI provider keys at **Settings → API Keys**.

---

## Environment Variables Reference

All variables are optional locally — hardcoded fallbacks cover the `docker-compose.yml` defaults.

| Variable | Default | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://intel:intel@localhost:5435/reddit_intel` | Change if you modify docker-compose |
| `REDIS_URL` | `redis://localhost:6381` | Change if you modify docker-compose |
| `PORT` | `3001` | API listen port |
| `FRONTEND_URL` | `http://localhost:3000` | CORS allowed origin |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | API base URL used by the browser |
| `JWT_SECRET` | `aria-dev-secret-…` | **Set this in production** — `openssl rand -hex 32` |

**AI provider keys are not environment variables.** They are entered in the app's Settings page and stored in the database. No `.env` entry needed.

---

## How the Scraper Works

ARIA uses [Playwright](https://playwright.dev) rather than the Reddit API for two reasons: the API has strict rate limits and requires OAuth credentials, while `old.reddit.com` is plain server-rendered HTML that is much faster to parse.

Anti-detection measures applied per scrape session:

- Randomly selected real Mac/Chrome user-agent string
- Randomised viewport dimensions (1280–1920 × 800–1080px)
- `navigator.webdriver` hidden at the V8 level via `addInitScript`
- Spoofed plugin count, `window.chrome` object, and permissions API
- Realistic `Accept` / `Sec-Fetch-*` HTTP headers
- Random human-like scroll steps between page loads
- Random delays between pages (5–10s) and between posts (2–5s)
- 180-day lookback window — stops paginating past older posts automatically

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for bug reports, feature requests, development setup, coding standards, and the pull request process.

---

## License

MIT License — see [LICENSE](./LICENSE) for full text.

You are free to use, modify, and distribute this software for any purpose, including commercially, as long as the original copyright notice is retained.

---

## Acknowledgements

- [Playwright](https://playwright.dev) — browser automation
- [Fastify](https://fastify.dev) — API framework
- [Drizzle ORM](https://orm.drizzle.team) — type-safe database access
- [BullMQ](https://bullmq.io) — job queue
- [Anthropic Claude](https://anthropic.com) — primary AI provider
- [Next.js](https://nextjs.org) — frontend framework
