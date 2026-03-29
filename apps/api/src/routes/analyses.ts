import type { FastifyInstance } from "fastify";
import { db, analyses, subreddits, settings } from "@reddit-intel/db";
import { eq, desc } from "drizzle-orm";
import { analyzeQueue } from "../lib/queue.js";
import { createBrowser, createContext } from "../lib/browser.js";

const PROVIDER_KEY_MAP: Record<string, string> = {
  anthropic: "anthropicKey",
  openai: "openaiKey",
  gemini: "geminiKey",
};

export async function analysesRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/subreddits/:name/analyses
   * List all analyses for a subreddit, most recent first.
   */
  fastify.get("/api/subreddits/:name/analyses", async (req, reply) => {
    const { name } = req.params as { name: string };

    const [sub] = await db
      .select({ id: subreddits.id })
      .from(subreddits)
      .where(eq(subreddits.name, name));

    if (!sub) {
      return reply.status(404).send({ error: `r/${name} not found` });
    }

    const rows = await db
      .select()
      .from(analyses)
      .where(eq(analyses.subredditId, sub.id))
      .orderBy(desc(analyses.createdAt));

    return reply.send(rows);
  });

  /**
   * POST /api/subreddits/:name/analyze
   * Body: { provider?: 'anthropic' | 'openai' | 'gemini' }
   * Enqueues an analysis job.
   */
  fastify.post("/api/subreddits/:name/analyze", async (req, reply) => {
    const { name } = req.params as { name: string };
    const body = req.body as { provider?: string };
    const provider = body?.provider ?? "anthropic";

    if (!["anthropic", "openai", "gemini"].includes(provider)) {
      return reply.status(400).send({ error: "provider must be anthropic, openai, or gemini" });
    }

    const settingKey = PROVIDER_KEY_MAP[provider];

    // Look up API key from settings table
    const [keyRow] = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, settingKey));

    if (!keyRow?.value) {
      return reply.status(400).send({
        error: `API key not configured for this provider`,
      });
    }

    // Find the subreddit
    const [sub] = await db
      .select({ id: subreddits.id, name: subreddits.name })
      .from(subreddits)
      .where(eq(subreddits.name, name));

    if (!sub) {
      return reply.status(404).send({ error: `r/${name} not found` });
    }

    // Enqueue analysis job
    await analyzeQueue.add(`analyze-${name}-${Date.now()}`, {
      subredditId: sub.id,
      subreddit: sub.name,
      apiKey: keyRow.value,
      provider,
    });

    return reply.send({ queued: true });
  });

  /**
   * GET /api/analyses/:id
   * Single analysis by UUID.
   */
  fastify.get("/api/analyses/:id", async (req, reply) => {
    const { id } = req.params as { id: string };

    const [analysis] = await db
      .select({
        id: analyses.id,
        subredditId: analyses.subredditId,
        subredditName: subreddits.name,
        model: analyses.model,
        totalPosts: analyses.totalPosts,
        totalComments: analyses.totalComments,
        painPoints: analyses.painPoints,
        createdAt: analyses.createdAt,
      })
      .from(analyses)
      .innerJoin(subreddits, eq(analyses.subredditId, subreddits.id))
      .where(eq(analyses.id, id));

    if (!analysis) {
      return reply.status(404).send({ error: "Analysis not found" });
    }

    return reply.send(analysis);
  });

  /**
   * GET /api/analyses/:id/pdf
   * Generate and stream a PDF report using Playwright.
   */
  fastify.get("/api/analyses/:id/pdf", async (req, reply) => {
    const { id } = req.params as { id: string };

    const [analysis] = await db
      .select({
        id: analyses.id,
        subredditId: analyses.subredditId,
        subredditName: subreddits.name,
        model: analyses.model,
        totalPosts: analyses.totalPosts,
        totalComments: analyses.totalComments,
        painPoints: analyses.painPoints,
        createdAt: analyses.createdAt,
      })
      .from(analyses)
      .innerJoin(subreddits, eq(analyses.subredditId, subreddits.id))
      .where(eq(analyses.id, id));

    if (!analysis) {
      return reply.status(404).send({ error: "Analysis not found" });
    }

    const painPoints = analysis.painPoints as Array<{
      theme: string;
      description: string;
      frequency: number;
      quotes: string[];
      relevanceToProduct?: string;
      relevanceToArca?: string;
    }>;

    const html = renderReportHtml({
      subreddit: analysis.subredditName,
      model: analysis.model,
      totalPosts: analysis.totalPosts,
      totalComments: analysis.totalComments,
      createdAt: analysis.createdAt,
      painPoints,
    });

    let browser = null;
    try {
      browser = await createBrowser();
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.setContent(html, { waitUntil: "domcontentloaded" });

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "20mm", bottom: "20mm", left: "18mm", right: "18mm" },
      });

      await context.close();

      const filename = `reddit-analysis-${analysis.subredditName}-${new Date(analysis.createdAt).toISOString().slice(0, 10)}.pdf`;

      reply.header("Content-Type", "application/pdf");
      reply.header("Content-Disposition", `attachment; filename="${filename}"`);
      return reply.send(Buffer.from(pdfBuffer));
    } finally {
      await browser?.close();
    }
  });
}

// ── HTML report renderer ──────────────────────────────────────────────────────

interface ReportData {
  subreddit: string;
  model: string;
  totalPosts: number;
  totalComments: number;
  createdAt: Date;
  painPoints: Array<{
    theme: string;
    description: string;
    frequency: number;
    quotes: string[];
    relevanceToProduct?: string;
    relevanceToArca?: string;
  }>;
}

function renderReportHtml(data: ReportData): string {
  const { subreddit, model, totalPosts, totalComments, createdAt, painPoints } = data;
  const date = new Date(createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const painPointsHtml = painPoints
    .map(
      (pp, i) => `
      <div class="pain-point">
        <div class="pp-header">
          <span class="pp-rank">#${i + 1}</span>
          <h2 class="pp-theme">${escapeHtml(pp.theme)}</h2>
          <span class="pp-freq">${pp.frequency} mentions</span>
        </div>
        <p class="pp-description">${escapeHtml(pp.description)}</p>
        ${
          pp.quotes && pp.quotes.length > 0
            ? `<div class="pp-quotes">
            ${pp.quotes
              .slice(0, 2)
              .map(
                (q) =>
                  `<blockquote class="pp-quote">${escapeHtml(q)}</blockquote>`,
              )
              .join("")}
          </div>`
            : ""
        }
        ${
          pp.relevanceToProduct || pp.relevanceToArca
            ? `<div class="pp-relevance">
            <strong>Product relevance:</strong> ${escapeHtml(pp.relevanceToProduct ?? pp.relevanceToArca ?? "")}
          </div>`
            : ""
        }
      </div>
    `,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reddit Intelligence Report — r/${escapeHtml(subreddit)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      color: #1a1a2e;
      background: #fff;
      line-height: 1.6;
    }
    .header {
      background: #0f3460;
      color: #fff;
      padding: 32px 40px;
      border-bottom: 4px solid #e94560;
    }
    .header h1 {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 6px;
    }
    .header .meta {
      opacity: 0.8;
      font-size: 12px;
    }
    .stats-bar {
      display: flex;
      gap: 24px;
      background: #f8f9fc;
      padding: 16px 40px;
      border-bottom: 1px solid #e2e8f0;
    }
    .stat {
      text-align: center;
    }
    .stat-value {
      font-size: 20px;
      font-weight: 700;
      color: #0f3460;
    }
    .stat-label {
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .content {
      padding: 24px 40px;
    }
    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: #0f3460;
      margin-bottom: 20px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e94560;
    }
    .pain-point {
      background: #f8f9fc;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #e94560;
      border-radius: 8px;
      padding: 18px 20px;
      margin-bottom: 16px;
      page-break-inside: avoid;
    }
    .pp-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 10px;
    }
    .pp-rank {
      background: #e94560;
      color: #fff;
      border-radius: 50%;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .pp-theme {
      font-size: 15px;
      font-weight: 700;
      color: #0f3460;
      flex: 1;
    }
    .pp-freq {
      background: #dbeafe;
      color: #1e40af;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      flex-shrink: 0;
    }
    .pp-description {
      color: #374151;
      margin-bottom: 12px;
      font-size: 13px;
    }
    .pp-quotes {
      margin-bottom: 10px;
    }
    .pp-quote {
      border-left: 3px solid #cbd5e1;
      padding: 6px 12px;
      margin: 6px 0;
      color: #4b5563;
      font-style: italic;
      font-size: 12px;
      background: #fff;
      border-radius: 0 4px 4px 0;
    }
    .pp-relevance {
      font-size: 12px;
      color: #059669;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 4px;
      padding: 6px 10px;
    }
    .footer {
      text-align: center;
      padding: 20px 40px;
      font-size: 11px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      margin-top: 16px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Reddit Intelligence Report</h1>
    <div class="meta">r/${escapeHtml(subreddit)} &nbsp;&bull;&nbsp; Generated ${date} &nbsp;&bull;&nbsp; Model: ${escapeHtml(model)}</div>
  </div>
  <div class="stats-bar">
    <div class="stat">
      <div class="stat-value">${totalPosts.toLocaleString()}</div>
      <div class="stat-label">Posts Analyzed</div>
    </div>
    <div class="stat">
      <div class="stat-value">${totalComments.toLocaleString()}</div>
      <div class="stat-label">Comments Analyzed</div>
    </div>
    <div class="stat">
      <div class="stat-value">${painPoints.length}</div>
      <div class="stat-label">Pain Points Found</div>
    </div>
  </div>
  <div class="content">
    <div class="section-title">Top Pain Points (Ranked by Frequency)</div>
    ${painPointsHtml}
  </div>
  <div class="footer">
    Generated by Reddit Intelligence &nbsp;&bull;&nbsp; reddit-intel
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
