# ── Stage: official Playwright image (Ubuntu Jammy + all Chromium deps) ────────
FROM mcr.microsoft.com/playwright:v1.58.2-jammy

LABEL description="Reddit RE agent scraper — Playwright + Bun inside a real browser environment"

# Install Bun (unzip is required by the install script)
RUN apt-get update && apt-get install -y --no-install-recommends unzip && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

# Tell playwright's npm package to use the browsers already installed in the image
# rather than downloading its own copy. The image puts them in /ms-playwright.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

WORKDIR /app

# Install dependencies first (layer cache)
COPY package.json ./
RUN bun install --frozen-lockfile

# Copy source
COPY . .

# Ensure output directories exist inside the container
RUN mkdir -p data reports

ENTRYPOINT ["bun", "src/index.ts"]
CMD ["help"]
