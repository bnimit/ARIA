/**
 * Anti-detection Playwright browser setup.
 * Ported from src/browser.ts — identical logic, re-exported for the API package.
 */

import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Safari/605.1.15",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15",
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function createBrowser(): Promise<Browser> {
  return chromium.launch({
    headless: true,
    args: [
      // Core anti-detection: suppress navigator.webdriver at the engine level
      "--disable-blink-features=AutomationControlled",
      // Container-safe flags
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      // Cosmetic — prevent first-run UI that could slow startup
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-infobars",
      // Disable unnecessary features that fingerprint the environment
      "--disable-extensions",
      "--disable-background-networking",
      "--disable-sync",
    ],
  });
}

export async function createContext(browser: Browser): Promise<BrowserContext> {
  const userAgent = randomItem(USER_AGENTS);
  // Vary viewport to avoid a fixed-size fingerprint
  const width  = randomInt(1280, 1920);
  const height = randomInt(800, 1080);

  const context = await browser.newContext({
    userAgent,
    viewport: { width, height },
    locale: "en-US",
    timezoneId: "America/New_York",
    extraHTTPHeaders: {
      "Accept-Language":           "en-US,en;q=0.9",
      "Accept":                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Encoding":           "gzip, deflate, br",
      "Sec-Fetch-Dest":            "document",
      "Sec-Fetch-Mode":            "navigate",
      "Sec-Fetch-Site":            "none",
      "Upgrade-Insecure-Requests": "1",
    },
  });

  /**
   * Remove all traces of Playwright's automation injection.
   * Runs before every page's JavaScript so it cannot be detected by scripts
   * that probe navigator.webdriver or window.chrome.
   */
  await context.addInitScript(`
    // 1. Hide webdriver flag
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

    // 2. Spoof plugin count (headless Chrome has 0; real Chrome has several)
    Object.defineProperty(navigator, 'plugins', {
      get: () => Object.assign([1, 2, 3, 4, 5], { item: () => null, namedItem: () => null, refresh: () => {} }),
    });

    // 3. Language consistency
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });

    // 4. Restore window.chrome that headless Chrome strips
    if (!window.chrome) {
      window.chrome = { runtime: {}, loadTimes: () => ({}), csi: () => ({}), app: {} };
    }

    // 5. Consistent permission API
    const originalQuery = window.navigator.permissions?.query?.bind(window.navigator.permissions);
    if (originalQuery) {
      window.navigator.permissions.query = (params) =>
        params.name === 'notifications'
          ? Promise.resolve({ state: Notification.permission, onchange: null })
          : originalQuery(params);
    }
  `);

  return context;
}

export async function humanDelay(min: number, max: number): Promise<void> {
  await new Promise<void>((r) => setTimeout(r, randomInt(min, max)));
}

/**
 * Simulate a human reading and scrolling the page.
 * Prevents detection heuristics that look for zero scroll / instant navigation.
 */
export async function humanScroll(page: Page): Promise<void> {
  const steps = randomInt(2, 4);
  for (let i = 0; i < steps; i++) {
    await page.evaluate(() => {
      window.scrollBy(0, Math.floor(Math.random() * 400 + 150));
    });
    await humanDelay(250, 700);
  }
}
