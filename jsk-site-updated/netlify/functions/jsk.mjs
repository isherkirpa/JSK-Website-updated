// ============================================================
// JSK Netlify Serverless Function — jsk.mjs
// Handles key management + proxies requests to Bot Hosting Server
// ============================================================
import pg from "pg";

const { Pool } = pg;

let pool;
function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes("localhost")
        ? false
        : { rejectUnauthorized: false },
    });
  }
  return pool;
}

const BOT_SERVER_URL    = process.env.BOT_SERVER_URL    ?? "";
const BOT_SERVER_SECRET = process.env.BOT_SERVER_SECRET ?? "";
const DEFAULT_ADMIN_PASS = "JSK@Admin2024";

// ─── DB SETUP ─────────────────────────────────────────────────────────────────

async function ensureTables(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS jsk_api_keys (
      id SERIAL PRIMARY KEY,
      tool_id TEXT NOT NULL,
      key TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL DEFAULT '',
      created_at BIGINT NOT NULL,
      expires_at BIGINT,
      is_active BOOLEAN NOT NULL DEFAULT true
    );
    CREATE TABLE IF NOT EXISTS jsk_config (
      config_key TEXT PRIMARY KEY,
      config_value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS jsk_sessions (
      id SERIAL PRIMARY KEY,
      key TEXT NOT NULL,
      tool_id TEXT NOT NULL,
      data JSONB NOT NULL DEFAULT '{}',
      updated_at BIGINT NOT NULL,
      UNIQUE(key, tool_id)
    );
    CREATE TABLE IF NOT EXISTS jsk_bot_tokens (
      id SERIAL PRIMARY KEY,
      tool_key TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      settings JSONB NOT NULL DEFAULT '{}',
      started_at BIGINT NOT NULL,
      UNIQUE(tool_key, token_hash)
    );
  `);
  // Migrate: add label column if missing
  await client.query(`
    ALTER TABLE jsk_api_keys ADD COLUMN IF NOT EXISTS label TEXT NOT NULL DEFAULT '';
  `).catch(() => {});
}

async function getAdminPassword(client) {
  const result = await client.query(
    "SELECT config_value FROM jsk_config WHERE config_key = 'admin_password' LIMIT 1"
  );
  return result.rows[0]?.config_value ?? DEFAULT_ADMIN_PASS;
}

// ─── KEY VALIDATION ───────────────────────────────────────────────────────────
// An 'admin' tool_id key is valid for ANY tool

async function validateKeyInternal(client, toolId, key) {
  const normalizedKey = key.trim().toUpperCase();
  // Check exact tool match first
  let result = await client.query(
    "SELECT * FROM jsk_api_keys WHERE tool_id = $1 AND key = $2 AND is_active = true LIMIT 1",
    [toolId, normalizedKey]
  );
  // If not found, check for 'admin' key that works for all tools
  if (!result.rows[0]) {
    result = await client.query(
      "SELECT * FROM jsk_api_keys WHERE tool_id = 'admin' AND key = $1 AND is_active = true LIMIT 1",
      [normalizedKey]
    );
  }
  if (!result.rows[0]) return { valid: false };
  const row = result.rows[0];
  const expired = row.expires_at !== null && Date.now() > parseInt(row.expires_at);
  if (expired) {
    await client.query(
      "UPDATE jsk_api_keys SET is_active = false WHERE id = $1",
      [row.id]
    );
    // Fire-and-forget: stop tokens on bot server for this key
    stopTokensForKey(normalizedKey).catch(() => {});
    return { valid: false, reason: "expired" };
  }
  return {
    valid: true,
    expiresAt: row.expires_at ? parseInt(row.expires_at) : null,
    createdAt: parseInt(row.created_at),
    label: row.label ?? "",
  };
}

async function stopTokensForKey(keyRef) {
  if (!BOT_SERVER_URL) return;
  await fetch(`${BOT_SERVER_URL}/api/stop-key-tokens`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Secret": BOT_SERVER_SECRET },
    body: JSON.stringify({ keyRef }),
  }).catch(() => {});
}

function generateKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let key = "";
  for (let i = 0; i < 20; i++) {
    if (i > 0 && i % 5 === 0) key += "-";
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

// ─── BOT SERVER PROXY ─────────────────────────────────────────────────────────

async function botServerRequest(path, method, body) {
  if (!BOT_SERVER_URL) {
    return { ok: false, error: "BOT_SERVER_URL not configured. Add it in Netlify environment variables." };
  }
  try {
    const res = await fetch(`${BOT_SERVER_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-API-Secret": BOT_SERVER_SECRET,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    return data;
  } catch (err) {
    return { ok: false, error: `Bot server unreachable: ${err.message}` };
  }
}

// ─── RESPONSE HELPERS ─────────────────────────────────────────────────────────

function json(body, status = 200) {
  return {
    statusCode: status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin":  "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin":  "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
      },
      body: "",
    };
  }

  if (!process.env.DATABASE_URL) {
    return json({ error: "DATABASE_URL not set in Netlify environment variables." }, 500);
  }

  const path   = event.path.replace(/.*\/jsk/, "");
  const method = event.httpMethod;
  let body = {};
  try { body = JSON.parse(event.body || "{}"); } catch {}

  const adminPass = event.headers?.["x-admin-password"] ?? "";

  const db = getPool();
  const client = await db.connect();
  try {
    await ensureTables(client);

    // ── KEY VALIDATION ──────────────────────────────────────────────────────
    if (method === "POST" && path === "/validate-key") {
      const { toolId, key } = body;
      if (!toolId || !key) return json({ valid: false, error: "toolId and key required" });
      const result = await validateKeyInternal(client, toolId, key);
      return json(result);
    }

    // ── ADMIN: VERIFY PASSWORD ──────────────────────────────────────────────
    if (method === "POST" && path === "/admin/verify") {
      const { password } = body;
      const stored = await getAdminPassword(client);
      return json({ valid: password === stored });
    }

    // ── ADMIN: CHANGE PASSWORD ──────────────────────────────────────────────
    if (method === "POST" && path === "/admin/password") {
      const stored = await getAdminPassword(client);
      if (adminPass !== stored) return json({ error: "Unauthorized" }, 401);
      const { newPassword } = body;
      if (!newPassword || newPassword.length < 6) return json({ error: "Password too short (min 6 chars)" }, 400);
      await client.query(
        "INSERT INTO jsk_config (config_key, config_value) VALUES ('admin_password', $1) ON CONFLICT (config_key) DO UPDATE SET config_value = $1",
        [newPassword]
      );
      return json({ success: true });
    }

    // ── ADMIN: LIST ALL KEYS ────────────────────────────────────────────────
    if (method === "GET" && path === "/keys") {
      const stored = await getAdminPassword(client);
      if (adminPass !== stored) return json({ error: "Unauthorized" }, 401);
      const result = await client.query(
        `SELECT id, tool_id as "toolId", key, label,
                created_at as "createdAt", expires_at as "expiresAt", is_active as "isActive"
         FROM jsk_api_keys
         ORDER BY created_at DESC`
      );
      return json({ keys: result.rows });
    }

    // ── ADMIN: CREATE KEY ───────────────────────────────────────────────────
    if (method === "POST" && path === "/keys") {
      const stored = await getAdminPassword(client);
      if (adminPass !== stored) return json({ error: "Unauthorized" }, 401);
      const { toolId, expiryHours, label } = body;
      const validTools = ["mass-dm", "token-checker", "onliner", "server-joiner", "booster", "admin"];
      if (!validTools.includes(toolId)) return json({ error: "Invalid toolId" }, 400);
      const key = generateKey();
      const createdAt = Date.now();
      const expiresAt = expiryHours === -1 || !expiryHours ? null : createdAt + expiryHours * 3600000;
      const safeLabel = (label ?? "").trim().slice(0, 60);
      await client.query(
        "INSERT INTO jsk_api_keys (tool_id, key, label, created_at, expires_at, is_active) VALUES ($1, $2, $3, $4, $5, true)",
        [toolId, key, safeLabel, createdAt, expiresAt]
      );
      const row = await client.query(
        `SELECT id, tool_id as "toolId", key, label,
                created_at as "createdAt", expires_at as "expiresAt", is_active as "isActive"
         FROM jsk_api_keys WHERE key = $1`,
        [key]
      );
      return json(row.rows[0]);
    }

    // ── ADMIN: DELETE KEY (hard delete) ─────────────────────────────────────
    if (method === "DELETE" && path.startsWith("/keys/")) {
      const stored = await getAdminPassword(client);
      if (adminPass !== stored) return json({ error: "Unauthorized" }, 401);
      const keyId = path.replace("/keys/", "");
      // Get the key value so we can stop its tokens
      const keyRow = await client.query("SELECT key FROM jsk_api_keys WHERE id = $1", [keyId]);
      if (keyRow.rows[0]) {
        stopTokensForKey(keyRow.rows[0].key).catch(() => {});
      }
      await client.query("DELETE FROM jsk_api_keys WHERE id = $1", [keyId]);
      return json({ success: true });
    }

    // ── ADMIN: DELETE ALL EXPIRED KEYS ──────────────────────────────────────
    if (method === "POST" && path === "/admin/cleanup-expired") {
      const stored = await getAdminPassword(client);
      if (adminPass !== stored) return json({ error: "Unauthorized" }, 401);
      const now = Date.now();
      // Get keys that are expired or inactive
      const expired = await client.query(
        "SELECT key FROM jsk_api_keys WHERE (expires_at IS NOT NULL AND expires_at < $1) OR is_active = false",
        [now]
      );
      // Stop all their tokens
      for (const row of expired.rows) {
        stopTokensForKey(row.key).catch(() => {});
      }
      const result = await client.query(
        "DELETE FROM jsk_api_keys WHERE (expires_at IS NOT NULL AND expires_at < $1) OR is_active = false",
        [now]
      );
      return json({ success: true, deleted: result.rowCount });
    }

    // ── SESSION: SAVE ────────────────────────────────────────────────────────
    if (method === "POST" && path === "/session") {
      const { key, toolId, data: sessionData } = body;
      if (!key || !toolId) return json({ error: "key and toolId required" }, 400);
      const keyResult = await validateKeyInternal(client, toolId, key);
      if (!keyResult.valid) return json({ error: "Invalid or expired key" }, 401);
      await client.query(
        "INSERT INTO jsk_sessions (key, tool_id, data, updated_at) VALUES ($1, $2, $3, $4) ON CONFLICT (key, tool_id) DO UPDATE SET data = $3, updated_at = $4",
        [key.trim().toUpperCase(), toolId, JSON.stringify(sessionData ?? {}), Date.now()]
      );
      return json({ success: true });
    }

    // ── ADMIN: LIST SESSIONS ────────────────────────────────────────────────
    if (method === "GET" && path === "/sessions") {
      const stored = await getAdminPassword(client);
      if (adminPass !== stored) return json({ error: "Unauthorized" }, 401);
      const result = await client.query(
        "SELECT key, tool_id as \"toolId\", data, updated_at as \"updatedAt\" FROM jsk_sessions ORDER BY updated_at DESC LIMIT 100"
      );
      return json({ sessions: result.rows });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // BOT SERVER PROXY ENDPOINTS
    // ══════════════════════════════════════════════════════════════════════════

    // ── BOT: START TOKEN ─────────────────────────────────────────────────────
    if (method === "POST" && path === "/bot/start") {
      const { key, token, settings } = body;
      if (!key || !token) return json({ error: "key and token required" }, 400);
      const keyResult = await validateKeyInternal(client, "onliner", key);
      if (!keyResult.valid) return json({ error: "Invalid or expired key", reason: keyResult.reason }, 401);
      const keyRef = key.trim().toUpperCase();
      const result = await botServerRequest("/api/token/start", "POST", { token, settings: settings ?? {}, keyRef });
      return json(result);
    }

    // ── BOT: STOP TOKEN ──────────────────────────────────────────────────────
    if (method === "POST" && path === "/bot/stop") {
      const { key, token, tid } = body;
      if (!key) return json({ error: "key required" }, 400);
      const keyResult = await validateKeyInternal(client, "onliner", key);
      if (!keyResult.valid) return json({ error: "Invalid or expired key" }, 401);
      const result = await botServerRequest("/api/token/stop", "POST", { token, tid });
      return json(result);
    }

    // ── BOT: GET MY TOKENS (by key) ──────────────────────────────────────────
    if (method === "POST" && path === "/bot/my-tokens") {
      const { key } = body;
      if (!key) return json({ error: "key required" }, 400);
      const keyResult = await validateKeyInternal(client, "onliner", key);
      if (!keyResult.valid) return json({ error: "Invalid or expired key" }, 401);
      const keyRef = key.trim().toUpperCase();
      const result = await botServerRequest("/api/my-tokens", "POST", { keyRef });
      return json(result);
    }

    // ── BOT: GET LIVE STATUS (admin) ─────────────────────────────────────────
    if (method === "GET" && path === "/bot/status") {
      const stored = await getAdminPassword(client);
      if (adminPass !== stored) return json({ error: "Unauthorized" }, 401);
      const result = await botServerRequest("/api/tokens", "GET");
      return json(result);
    }

    // ── BOT: SERVER JOINER ───────────────────────────────────────────────────
    if (method === "POST" && path === "/bot/join") {
      const { key, tokens, inviteCode, delayMs } = body;
      if (!key || !tokens || !inviteCode) return json({ error: "key, tokens, and inviteCode required" }, 400);
      const keyResult = await validateKeyInternal(client, "server-joiner", key);
      if (!keyResult.valid) return json({ error: "Invalid or expired key", reason: keyResult.reason }, 401);
      const result = await botServerRequest("/api/server-join", "POST", { tokens, inviteCode, delayMs: delayMs ?? 1500 });
      return json(result);
    }

    // ── BOT: SERVER LEAVE ────────────────────────────────────────────────────
    if (method === "POST" && path === "/bot/leave") {
      const { key, tokens, guildId, delayMs } = body;
      if (!key || !tokens || !guildId) return json({ error: "key, tokens, and guildId required" }, 400);
      const keyResult = await validateKeyInternal(client, "server-joiner", key);
      if (!keyResult.valid) return json({ error: "Invalid or expired key", reason: keyResult.reason }, 401);
      const result = await botServerRequest("/api/server-leave", "POST", { tokens, guildId, delayMs: delayMs ?? 1000 });
      return json(result);
    }

    // ── BOT: JOIN HISTORY ────────────────────────────────────────────────────
    if (method === "GET" && path === "/bot/joins") {
      const stored = await getAdminPassword(client);
      if (adminPass !== stored) return json({ error: "Unauthorized" }, 401);
      const result = await botServerRequest("/api/joins/history", "GET");
      return json(result);
    }

    // ── BOT: BOOST ───────────────────────────────────────────────────────────
    if (method === "POST" && path === "/bot/boost") {
      const { key, tokens, guildId, globalName, nick, bio, avatarBase64, bannerBase64, delayMs } = body;
      if (!key || !tokens || !guildId) return json({ error: "key, tokens, and guildId required" }, 400);
      const keyResult = await validateKeyInternal(client, "booster", key);
      if (!keyResult.valid) return json({ error: "Invalid or expired key", reason: keyResult.reason }, 401);
      const result = await botServerRequest("/api/boost", "POST", {
        tokens, guildId, globalName, nick, bio, avatarBase64, bannerBase64, delayMs: delayMs ?? 500,
      });
      return json(result);
    }

    return json({ error: "Not found" }, 404);
  } finally {
    client.release();
  }
};
