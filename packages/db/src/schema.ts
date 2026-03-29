import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ── settings ──────────────────────────────────────────────────────────────────

export const settings = pgTable("settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── subreddits ────────────────────────────────────────────────────────────────

export const subreddits = pgTable("subreddits", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).unique().notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── jobs ──────────────────────────────────────────────────────────────────────

export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  subredditId: uuid("subreddit_id")
    .notNull()
    .references(() => subreddits.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  pagesTarget: integer("pages_target").default(8).notNull(),
  pagesScraped: integer("pages_scraped").default(0).notNull(),
  postsFound: integer("posts_found").default(0).notNull(),
  commentsFound: integer("comments_found").default(0).notNull(),
  error: text("error"),
  lastAfter: varchar("last_after", { length: 100 }),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── posts ─────────────────────────────────────────────────────────────────────

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    redditId: varchar("reddit_id", { length: 20 }).notNull(),
    subredditId: uuid("subreddit_id")
      .notNull()
      .references(() => subreddits.id, { onDelete: "cascade" }),
    jobId: uuid("job_id").references(() => jobs.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    body: text("body"),
    author: varchar("author", { length: 100 }),
    score: integer("score").default(0).notNull(),
    numComments: integer("num_comments").default(0).notNull(),
    flair: varchar("flair", { length: 200 }),
    url: text("url").notNull(),
    createdUtc: integer("created_utc").notNull(),
    scrapedAt: timestamp("scraped_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("posts_reddit_id_subreddit_id_idx").on(table.redditId, table.subredditId)],
);

// ── comments ──────────────────────────────────────────────────────────────────

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  redditId: varchar("reddit_id", { length: 20 }).unique().notNull(),
  postId: uuid("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  parentRedditId: varchar("parent_reddit_id", { length: 20 }),
  author: varchar("author", { length: 100 }),
  body: text("body").notNull(),
  score: integer("score").default(0).notNull(),
  depth: integer("depth").default(0).notNull(),
  scrapedAt: timestamp("scraped_at").defaultNow().notNull(),
});

// ── analyses ──────────────────────────────────────────────────────────────────

export const analyses = pgTable("analyses", {
  id: uuid("id").primaryKey().defaultRandom(),
  subredditId: uuid("subreddit_id")
    .notNull()
    .references(() => subreddits.id, { onDelete: "cascade" }),
  model: varchar("model", { length: 50 }).notNull(),
  totalPosts: integer("total_posts").notNull(),
  totalComments: integer("total_comments").notNull(),
  painPoints: jsonb("pain_points").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
