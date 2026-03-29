# ARIA — Reddit Intelligence Platform

> Scrape any subreddit, extract user pain points with AI, and turn raw Reddit discussions into structured product insights.

ARIA combines a human-behaviour-mimicking web scraper with a two-pass LLM analysis pipeline. Point it at any subreddit, kick off a scrape job, then trigger an AI analysis — you get back a ranked list of pain points, each with frequency scores, user quotes, and product relevance notes.

---

## Features

- **Human-like scraper** — Playwright + Chromium targets `old.reddit.com` (plain HTML, no JS required). Rotates user-agents, randomises viewport, spoofs `navigator.webdriver`, and injects random scroll/delay behaviour to avoid bot detection.
- **Live job progress** — SSE stream delivers real-time page/post/comment counts to the UI as scraping runs.
- **Two-pass AI analysis** — Pass 1 uses a cheap fast model (Haiku / GPT-4o-mini / Gemini Flash) to batch-extract pain points from every 25 posts. Pass 2 uses a smarter model (Sonnet / GPT-4o / Gemini Pro) to deduplicate, rank, and annotate them.
- **Multi-provider LLMs** — Anthropic, OpenAI, and Gemini supported; switch per-analysis from the UI.
- **Auth** — Email/password signup (argon2id via Bun), JWT sessions, forgot/reset password flow.
- **Clean dashboard** — CareHub-inspired UI: white sidebar, teal-green accent, top search bar, stat cards, per-community analysis history.

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

### 3. Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in:

```env
# Database (matches docker-compose defaults — no change needed locally)
DATABASE_URL=postgresql://intel:intel@localhost:5435/reddit_intel

# Redis (matches docker-compose defaults)
REDIS_URL=redis://localhost:6381

# API
PORT=3001
FRONTEND_URL=http://localhost:3000

# Web
NEXT_PUBLIC_API_URL=http://localhost:3001

# AI keys — add at least one
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...
```

> AI keys can also be entered directly in the app's **Settings** page after signing up — they are stored encrypted in the database.

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
   - **Pass 1** — batches every 25 posts through a fast model to extract raw themes
   - **Pass 2** — aggregates all batches through a smarter model to deduplicate, rank by frequency, and add product relevance notes
4. Results appear as ranked pain point cards with frequency bars and example user quotes

### Settings

Add or update AI provider keys at **Settings → API Keys**.

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string (BullMQ) |
| `PORT` | No | API port (default: `3001`) |
| `FRONTEND_URL` | No | Allowed CORS origin (default: `http://localhost:3000`) |
| `NEXT_PUBLIC_API_URL` | No | API base URL for the browser (default: `http://localhost:3001`) |
| `JWT_SECRET` | No | JWT signing secret — **set this in production** |
| `ANTHROPIC_API_KEY` | No* | Anthropic API key (can be set in UI) |
| `OPENAI_API_KEY` | No* | OpenAI API key (can be set in UI) |
| `GEMINI_API_KEY` | No* | Google Gemini API key (can be set in UI) |

*At least one AI key is required to run analyses.

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

Contributions are welcome. Please follow these steps:

1. **Fork** the repository and create a feature branch:
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes.** Keep commits focused — one logical change per commit.

3. **Run the build** before opening a PR:
   ```bash
   bun run build
   ```

4. **Open a Pull Request** against `main` with a clear description of what changed and why.

### Guidelines

- Follow the existing code style (TypeScript strict mode, Bun APIs preferred over Node equivalents)
- Do not commit `.env` files or API keys
- Keep PRs small and focused — large refactors should be discussed in an issue first
- Add a brief description to your PR explaining the motivation

### Reporting Issues

Open an issue on GitHub with:
- A clear title and description
- Steps to reproduce (for bugs)
- Expected vs actual behaviour
- Your OS, Bun version, and Node version if relevant

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
