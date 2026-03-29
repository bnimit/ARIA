import type { FastifyInstance } from "fastify";
import { db, subreddits, posts, comments, jobs, analyses } from "@reddit-intel/db";
import { eq, count, max, sql, desc } from "drizzle-orm";

const SUBREDDIT_NAME_RE = /^[A-Za-z0-9_]{3,50}$/;

export async function subredditsRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/subreddits
   * List all tracked subreddits with aggregate stats.
   */
  fastify.get("/api/subreddits", async (_req, reply) => {
    const rows = await db
      .select({
        id: subreddits.id,
        name: subreddits.name,
        description: subreddits.description,
        createdAt: subreddits.createdAt,
        postCount: count(posts.id),
        lastJobAt: max(jobs.completedAt),
      })
      .from(subreddits)
      .leftJoin(posts, eq(posts.subredditId, subreddits.id))
      .leftJoin(jobs, eq(jobs.subredditId, subreddits.id))
      .groupBy(subreddits.id, subreddits.name, subreddits.description, subreddits.createdAt)
      .orderBy(subreddits.createdAt);

    // Get comment counts separately (joining three levels is messier)
    const commentCounts = await db
      .select({
        subredditId: posts.subredditId,
        commentCount: count(comments.id),
      })
      .from(comments)
      .innerJoin(posts, eq(comments.postId, posts.id))
      .groupBy(posts.subredditId);

    const commentMap = new Map(commentCounts.map((c) => [c.subredditId, c.commentCount]));

    const result = rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      createdAt: row.createdAt,
      postCount: row.postCount ?? 0,
      commentCount: commentMap.get(row.id) ?? 0,
      lastJobAt: row.lastJobAt ?? null,
    }));

    return reply.send(result);
  });

  /**
   * POST /api/subreddits
   * Body: { name: string }
   */
  fastify.post("/api/subreddits", async (req, reply) => {
    const body = req.body as { name?: string };

    if (!body?.name || typeof body.name !== "string") {
      return reply.status(400).send({ error: "name is required" });
    }

    const name = body.name.trim().replace(/^r\//, ""); // strip leading r/ if present

    if (!SUBREDDIT_NAME_RE.test(name)) {
      return reply.status(400).send({
        error: "Subreddit name must be 3–50 alphanumeric characters or underscores",
      });
    }

    // Check for duplicates
    const [existing] = await db
      .select({ id: subreddits.id })
      .from(subreddits)
      .where(eq(subreddits.name, name));

    if (existing) {
      return reply.status(409).send({ error: `r/${name} is already being tracked` });
    }

    const [created] = await db
      .insert(subreddits)
      .values({ name })
      .returning();

    return reply.status(201).send(created);
  });

  /**
   * GET /api/subreddits/:name
   * Single subreddit with stats + recent analyses (last 5).
   */
  fastify.get("/api/subreddits/:name", async (req, reply) => {
    const { name } = req.params as { name: string };

    const [sub] = await db
      .select()
      .from(subreddits)
      .where(eq(subreddits.name, name));

    if (!sub) {
      return reply.status(404).send({ error: `r/${name} not found` });
    }

    const [postCountRow] = await db
      .select({ total: count() })
      .from(posts)
      .where(eq(posts.subredditId, sub.id));

    const postIds = (
      await db
        .select({ id: posts.id })
        .from(posts)
        .where(eq(posts.subredditId, sub.id))
    ).map((r) => r.id);

    let commentTotal = 0;
    if (postIds.length > 0) {
      const { inArray } = await import("drizzle-orm");
      const [commentCountRow] = await db
        .select({ total: count() })
        .from(comments)
        .where(inArray(comments.postId, postIds));
      commentTotal = commentCountRow?.total ?? 0;
    }

    const [lastJobRow] = await db
      .select({ lastJobAt: max(jobs.completedAt) })
      .from(jobs)
      .where(eq(jobs.subredditId, sub.id));

    const recentAnalyses = await db
      .select()
      .from(analyses)
      .where(eq(analyses.subredditId, sub.id))
      .orderBy(desc(analyses.createdAt))
      .limit(5);

    return reply.send({
      ...sub,
      postCount: postCountRow?.total ?? 0,
      commentCount: commentTotal,
      lastJobAt: lastJobRow?.lastJobAt ?? null,
      recentAnalyses,
    });
  });

  /**
   * DELETE /api/subreddits/:name
   * Deletes subreddit and cascades to jobs, posts, comments, analyses.
   */
  fastify.delete("/api/subreddits/:name", async (req, reply) => {
    const { name } = req.params as { name: string };

    const [sub] = await db
      .select({ id: subreddits.id })
      .from(subreddits)
      .where(eq(subreddits.name, name));

    if (!sub) {
      return reply.status(404).send({ error: `r/${name} not found` });
    }

    await db.delete(subreddits).where(eq(subreddits.id, sub.id));

    return reply.send({ ok: true });
  });
}
