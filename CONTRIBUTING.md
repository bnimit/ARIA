# Contributing to ARIA

Thank you for your interest in contributing. This document covers everything you need to get a change merged — from reporting a bug to submitting a pull request.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Ways to Contribute](#ways-to-contribute)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Messages](#commit-messages)

---

## Code of Conduct

Be respectful. Constructive criticism is welcome; personal attacks are not. We are here to build something useful together.

---

## Ways to Contribute

- **Report a bug** — open an issue with a clear reproduction
- **Suggest a feature** — open an issue describing the problem it solves
- **Fix a bug** — comment on an existing issue and open a PR
- **Improve documentation** — typos, outdated steps, missing context
- **Write tests** — coverage is always welcome

If you plan a large change, open an issue first to discuss the approach before writing code. This avoids wasted effort on work that might not align with the project direction.

---

## Reporting Bugs

Open an issue and include:

1. **Summary** — one sentence describing what went wrong
2. **Steps to reproduce** — numbered, minimal steps that reliably trigger the bug
3. **Expected behaviour** — what you expected to happen
4. **Actual behaviour** — what actually happened (include error messages and stack traces)
5. **Environment** — OS, Bun version (`bun --version`), browser if relevant

---

## Suggesting Features

Open an issue and include:

1. **Problem statement** — what problem does this solve? Who has it?
2. **Proposed solution** — your idea for how to address it
3. **Alternatives considered** — other approaches you thought about and why you prefer yours

---

## Development Setup

### Prerequisites

- [Bun](https://bun.sh) v1.1+
- [Docker](https://docs.docker.com/get-docker/)
- [Playwright browsers](https://playwright.dev/docs/browsers) — installed automatically via `bun install`

### Steps

```bash
# 1. Fork and clone
git clone git@github.com:YOUR_USERNAME/ARIA.git
cd ARIA

# 2. Install dependencies
bun install

# 3. Start Postgres + Redis
docker compose up -d

# 4. Run migrations
bun db:migrate

# 5. Start dev servers (API on :3001, web on :3000)
bun run dev
```

No `.env` file is needed for local development — all variables have sensible defaults. See the [README](./README.md) for details.

---

## Making Changes

### 1. Create a branch

Branch off `main` with a descriptive name:

```bash
git checkout -b fix/scraper-stale-handle
git checkout -b feat/export-analysis-csv
git checkout -b docs/update-setup-steps
```

Prefixes: `feat/`, `fix/`, `docs/`, `refactor/`, `chore/`

### 2. Make your changes

- Keep each commit focused on a single logical change
- Run the build before committing — it catches TypeScript errors:

```bash
bun run build
```

### 3. Test your changes manually

There are no automated tests yet. Please manually verify:

- The feature you changed still works end-to-end
- You haven't broken adjacent functionality (scrape a subreddit, run an analysis, check auth flows)

---

## Pull Request Process

1. Push your branch and open a PR against `main`
2. Fill in the PR description:
   - **What** changed
   - **Why** (link the issue if one exists)
   - **How to test** — steps a reviewer can follow
3. Keep PRs small and focused. A PR that does one thing is much easier to review than one that does five
4. A maintainer will review and either approve, request changes, or explain why it won't be merged
5. Once approved, a maintainer will squash-merge into `main`

---

## Coding Standards

- **Language**: TypeScript with strict mode enabled
- **Runtime**: Bun — prefer Bun-native APIs over Node equivalents (e.g. `Bun.password.hash` over `bcrypt`, `Bun.file` over `fs`)
- **Formatting**: Follow the existing style in the file you're editing. No formatter is enforced yet — just be consistent
- **Imports**: Use named imports. Avoid default exports except where required by the framework (Next.js pages)
- **Errors**: Do not swallow errors silently. Either handle them explicitly or let them propagate
- **No new dependencies without discussion**: Open an issue first if you want to add a package

### Project-specific patterns

- CSS is written as inline style objects — no Tailwind, no CSS modules
- All colours are CSS variables — no hardcoded hex values in components
- Database access goes through `packages/db` — don't import `drizzle-orm` directly in route files; use the exported `db` instance
- `exactOptionalPropertyTypes` is enabled — use `...(val != null ? { prop: val } : {})` for conditional spreads

---

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org) format:

```
<type>: <short summary>

[optional body]
```

Types: `feat`, `fix`, `docs`, `refactor`, `chore`, `test`

Examples:

```
feat: add CSV export for analysis results
fix: prevent stale ElementHandle errors in scraper listing page
docs: clarify that AI keys are stored in DB not .env
refactor: extract auth token helpers into lib/auth.ts
```

- Use the imperative mood: "add", not "added" or "adds"
- Keep the summary under 72 characters
- Reference issues in the body when relevant: `Closes #42`
