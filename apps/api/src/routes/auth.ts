/**
 * Auth routes — signup / signin / forgot-password / reset-password
 *
 * Credentials stored in the settings table:
 *   admin_email          — the admin's email
 *   admin_name           — display name
 *   admin_password_hash  — Bun argon2id hash
 *   reset_token          — "<token>:<expiry_ms>" (cleared after use)
 */

import type { FastifyInstance } from "fastify";
import { db, settings } from "@reddit-intel/db";
import { eq, sql } from "drizzle-orm";
import { randomBytes } from "crypto";

export async function authRoutes(fastify: FastifyInstance) {
  // ── GET /auth/status ── Check whether an account has been created
  fastify.get("/auth/status", async () => {
    const rows = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, "admin_email"))
      .limit(1);
    return { hasAccount: rows.length > 0 };
  });

  // ── POST /auth/signup ── First-time account creation
  fastify.post("/auth/signup", async (req, reply) => {
    const { email, password, name } = req.body as {
      email?: string;
      password?: string;
      name?: string;
    };

    if (!email?.trim() || !password?.trim()) {
      return reply.status(400).send({ message: "Email and password are required" });
    }
    if (password.length < 8) {
      return reply.status(400).send({ message: "Password must be at least 8 characters" });
    }

    const existing = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "admin_email"))
      .limit(1);
    if (existing.length > 0) {
      return reply.status(409).send({ message: "An account already exists. Please sign in." });
    }

    const hash = await Bun.password.hash(password, { algorithm: "argon2id" });
    const displayName = name?.trim() || email.split("@")[0];

    await db
      .insert(settings)
      .values([
        { key: "admin_email", value: email.toLowerCase().trim() },
        { key: "admin_name", value: displayName },
        { key: "admin_password_hash", value: hash },
      ])
      .onConflictDoUpdate({ target: settings.key, set: { value: sql`excluded.value` } });

    const token = await fastify.jwt.sign({ email: email.toLowerCase().trim(), name: displayName });
    return reply.status(201).send({ token, user: { email: email.toLowerCase().trim(), name: displayName } });
  });

  // ── POST /auth/signin ── Sign in with email + password
  fastify.post("/auth/signin", async (req, reply) => {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email?.trim() || !password?.trim()) {
      return reply.status(400).send({ message: "Email and password are required" });
    }

    const [storedEmail, storedHash, storedName] = await Promise.all([
      db.select().from(settings).where(eq(settings.key, "admin_email")).limit(1),
      db.select().from(settings).where(eq(settings.key, "admin_password_hash")).limit(1),
      db.select().from(settings).where(eq(settings.key, "admin_name")).limit(1),
    ]);

    if (!storedEmail.length || storedEmail[0].value !== email.toLowerCase().trim()) {
      return reply.status(401).send({ message: "Invalid email or password" });
    }

    const valid = await Bun.password.verify(password, storedHash[0]?.value ?? "");
    if (!valid) {
      return reply.status(401).send({ message: "Invalid email or password" });
    }

    const name = storedName[0]?.value || email.split("@")[0];
    const token = await fastify.jwt.sign({ email: storedEmail[0].value, name });
    return { token, user: { email: storedEmail[0].value, name } };
  });

  // ── POST /auth/forgot-password ── Generate a reset token (logs it in dev)
  fastify.post("/auth/forgot-password", async (req, reply) => {
    const { email } = req.body as { email?: string };

    if (!email?.trim()) {
      return reply.status(400).send({ message: "Email is required" });
    }

    const [stored] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "admin_email"))
      .limit(1);

    // Always return success to prevent email enumeration
    if (!stored || stored.value !== email.toLowerCase().trim()) {
      return { ok: true, message: "If that email exists, a reset link has been sent." };
    }

    const resetToken = randomBytes(32).toString("hex");
    const expiry = Date.now() + 60 * 60 * 1000; // 1 hour

    await db
      .insert(settings)
      .values({ key: "reset_token", value: `${resetToken}:${expiry}` })
      .onConflictDoUpdate({ target: settings.key, set: { value: sql`excluded.value` } });

    // In production: send an email. In dev: expose the token.
    fastify.log.info(`[auth] Reset token for ${email}: ${resetToken}`);
    const isDev = process.env.NODE_ENV !== "production";

    return {
      ok: true,
      message: "If that email exists, a reset link has been sent.",
      ...(isDev ? { _devToken: resetToken } : {}),
    };
  });

  // ── POST /auth/reset-password ── Reset password with a valid token
  fastify.post("/auth/reset-password", async (req, reply) => {
    const { token, password } = req.body as { token?: string; password?: string };

    if (!token?.trim() || !password?.trim()) {
      return reply.status(400).send({ message: "Token and new password are required" });
    }
    if (password.length < 8) {
      return reply.status(400).send({ message: "Password must be at least 8 characters" });
    }

    const [stored] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "reset_token"))
      .limit(1);

    if (!stored) {
      return reply.status(400).send({ message: "Invalid or expired reset token" });
    }

    const [storedToken, expiry] = stored.value.split(":");
    if (storedToken !== token.trim() || Date.now() > Number(expiry)) {
      return reply.status(400).send({ message: "Invalid or expired reset token" });
    }

    const hash = await Bun.password.hash(password, { algorithm: "argon2id" });

    await db
      .insert(settings)
      .values({ key: "admin_password_hash", value: hash })
      .onConflictDoUpdate({ target: settings.key, set: { value: sql`excluded.value` } });

    // Clear the used token
    await db.delete(settings).where(eq(settings.key, "reset_token"));

    return { ok: true };
  });

  // ── GET /auth/me ── Verify token and return current user
  fastify.get("/auth/me", {
    onRequest: [fastify.authenticate],
  }, async (req) => {
    const user = req.user as { email: string; name: string };
    return { email: user.email, name: user.name };
  });
}
