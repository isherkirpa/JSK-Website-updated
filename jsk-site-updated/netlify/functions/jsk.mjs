// ============================================================
// JSK Netlify Serverless Function — jsk.mjs  (UPDATED)
// Changes:
//   - /bot/join and /bot/leave now call Discord API DIRECTLY
//   - No longer proxies join/leave to bothosting.net
//   - CapMonster (capmonster.cloud) used for captcha solving
//   - Add CAPMONSTER_API_KEY to Netlify env vars to enable it
//   - BOT_SERVER_URL still needed only for Onliner (token keep-alive)
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

const BOT_SERVER_URL     = process.env.BOT_SERVER_URL     ?? "";
const BOT_SERVER_SECRET  = process.env.BOT_SERVER_SECRET  ?? "";
const CAPMONSTER_API_KEY = process.env.CAPMONSTER_API_KEY ?? "";
const DEFAULT_ADMIN_PASS = "JSK@Admin2024";

// ─── DISCORD CONSTANTS ────────────────────────────────────────────────────────

const CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

const SUPER_PROPERTIES = Buffer.from(
  JSON.stringify({
    os: "Windows",
    browser: "Chrome",
    device: "",
    system_locale: "en-US",
    browser_user_agent: CHROME_UA,
    browser_version: "123.0.0.0",
    os_version: "10",
    referrer: "https://discord.com/",
    referring_domain: "discord.com",
    referrer_current: "",
    referring_domain_current: "",
    release_channel: "stable",
    client_build_number: 279156,
    client_event_source: null,
  })
).toString("base64");

const CONTEXT_PROPERTIES = Buffer.from(
  JSON.stringify({ location: "Join Guild", location_guild_id: null })
).toString("base64");

const DISCORD_HCAPTCHA_SITEKEY = "4c672d35-0701-42b2-88c3-78380b0db560";

function discordHeaders(token, extra = {}) {
  return {
    Authorization: token,
    "Content-Type": "application/json",
    "User-Agent": CHROME_UA,
    "X-Super-Properties": SUPER_PROPERTIES,
    "X-Context-Properties": CONTEXT_PROPERTIES,
    "X-Discord-Locale": "en-US",
    "X-Discord-Timezone": "America/New_York",
    Accept: "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    Origin: "https://discord.com",
    Referer: "https://discord.com/",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    ...extra,
  };
}

function extractInviteCode(raw) {
  const m = raw
    .trim()
    .match(/(?:https?:\/\/)?(?:www\.)?discord(?:\.gg|\.com\/invite)\/([a-zA-Z0-9\-_]+)/);
  return m ? m[1] : raw.trim();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getFingerprint(token) {
  try {
    const r = await fetch("https://discord.com/api/v9/experiments", {
      headers: discordHeaders(token),
    });
    const fp = r.headers.get("X-Fingerprint");
    if (fp) return fp;
    if (r.ok) {
      const j = await r.json();
      return j.fingerprint ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

// ─── CAPMONSTER SOLVER ────────────────────────────────────────────────────────

async function solveCapmonster(sitekey, pageUrl, apiKey) {
  const taskTypes = [
    "HCaptchaTaskProxyless",
    "HCaptchaTask",
    "HCaptchaTaskProxyLess",
  ];
  for (const taskType of taskTypes) {
    let body;
    try {
      const createRes = await fetch("https://api.capmonster.cloud/createTask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientKey: apiKey,
          task: {
            type: taskType,
            websiteURL: pageUrl,
            websiteKey: sitekey,
            userAgent: CHROME_UA,
          },
        }),
      });
      body = await createRes.json();
    } catch {
      return null;
    }

    if (body.errorCode === "ERROR_TASK_NOT_SUPPORTED") continue;
    if (body.errorId) return null;

    const taskId = body.taskId;
    for (let i = 0; i < 30; i++) {
      await sleep(3000);
      try {
        const pollRes = await fetch(
          "https://api.capmonster.cloud/getTaskResult",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clientKey: apiKey, taskId }),
          }
        );
        const d = await pollRes.json();
        if (d.errorId) return null;
        if (d.status === "ready") {
          const sol = d.solution ?? {};
          return sol.gRecaptchaResponse ?? sol.token ?? sol.answer ?? null;
        }
      } catch {
        return null;
      }
    }
    return null;
  }
  return null;
}

// ─── DISCORD JOIN (direct) ────────────────────────────────────────────────────

async function discordJoin(tokens, inviteCode, delayMs) {
  const results = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const entry = {
      token: token.slice(0, 20) + "...",
      invite: inviteCode,
      timestamp: new Date().toISOString(),
      success: false,
      status: null,
      error: "",
      message: "",
    };

    const setMsg = (msg) => {
      entry.error = msg;
      entry.message = msg;
    };

    try {
      // Step 1: get Discord fingerprint (makes request look legit)
      const fp = await getFingerprint(token);
      const hdrs = discordHeaders(token, fp ? { "X-Fingerprint": fp } : {});

      // Step 2: first join attempt
      let r = await fetch(
        `https://discord.com/api/v9/invites/${inviteCode}`,
        { method: "POST", headers: hdrs, body: JSON.stringify({}) }
      );
      entry.status = r.status;
      let respJson = await r.json().catch(() => ({}));
      let discordMsg = respJson.message ?? "";
      const discordCode = respJson.code ?? 0;

      // Step 3: handle captcha
      if (r.status === 400 && respJson.captcha_key) {
        const sitekey = respJson.captcha_sitekey ?? DISCORD_HCAPTCHA_SITEKEY;
        const rqdata  = respJson.captcha_rqdata  ?? "";
        const rqtoken = respJson.captcha_rqtoken ?? "";

        let captchaToken = null;
        if (CAPMONSTER_API_KEY) {
          captchaToken = await solveCapmonster(
            sitekey,
            "https://discord.com",
            CAPMONSTER_API_KEY
          );
        }

        if (!captchaToken) {
          setMsg(
            CAPMONSTER_API_KEY
              ? "Captcha required — CapMonster could not solve it. Check balance at capmonster.cloud"
              : "Captcha required — add CAPMONSTER_API_KEY to Netlify env vars"
          );
          results.push(entry);
          if (delayMs > 0 && i < tokens.length - 1) await sleep(delayMs);
          continue;
        }

        const captchaBody = { captcha_key: captchaToken };
        if (rqdata)  captchaBody.captcha_rqdata  = rqdata;
        if (rqtoken) captchaBody.captcha_rqtoken = rqtoken;

        r = await fetch(
          `https://discord.com/api/v9/invites/${inviteCode}`,
          { method: "POST", headers: hdrs, body: JSON.stringify(captchaBody) }
        );
        entry.status = r.status;
        respJson   = await r.json().catch(() => ({}));
        discordMsg = respJson.message ?? "";
      }

      // Step 4: process result
      if ([200, 201, 204].includes(r.status)) {
        entry.success = true;
        const guildName = (respJson.guild ?? {}).name ?? "";
        entry.guild   = guildName;
        entry.error   = "";
        entry.message = guildName ? `Joined: ${guildName}` : "Joined successfully";
      } else if (r.status === 400) {
        setMsg(
          discordCode === 40006
            ? "Already a member of this server"
            : discordMsg || "Bad request — token may need phone verification"
        );
      } else if (r.status === 401) {
        setMsg("Token is invalid or expired");
      } else if (r.status === 403) {
        setMsg(discordMsg || "Forbidden — token banned or phone verify required");
      } else if (r.status === 404) {
        setMsg("Invite not found or expired");
      } else if (r.status === 429) {
        setMsg(`Rate limited — retry after ${respJson.retry_after ?? 1}s`);
      } else {
        setMsg(discordMsg || `HTTP ${r.status}`);
      }
    } catch (e) {
      entry.error   = String(e).slice(0, 120);
      entry.message = String(e).slice(0, 120);
    }

    results.push(entry);
    if (delayMs > 0 && i < tokens.length - 1) await sleep(delayMs);
  }

  const successCount = results.filter((r) => r.success).length;
  return {
    ok: true,
    invite: inviteCode,
    results,
    summary: {
      total: results.length,
      success: successCount,
      failed: results.length - successCount,
    },
  };
}

// ─── DISCORD LEAVE (direct) ───────────────────────────────────────────────────

async function discordLeave(tokens, guildId, delayMs) {
  const results = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const entry = {
      token: token.slice(0, 20) + "...",
      guildId,
      timestamp: new Date().toISOString(),
      success: false,
      status: null,
      error: "",
      message: "",
    };

    const setMsg = (msg) => {
      entry.error = msg;
      entry.message = msg;
    };

    try {
      const r = await fetch(
        `https://discord.com/api/v9/users/@me/guilds/${guildId}`,
        {
          method: "DELETE",
          headers: discordHeaders(token),
        }
      );
      entry.status = r.status;
      const respJson  = await r.json().catch(() => ({}));
      const discordMsg = respJson.message ?? "";

      if ([200, 201, 204].includes(r.status)) {
        entry.success = true;
        entry.error   = "";
        entry.message = "Left successfully";
      } else if (r.status === 401) {
        setMsg("Token is invalid or expired");
      } else if (r.status === 403) {
        setMsg(discordMsg || "Cannot leave — you may be the server owner");
      } else if (r.status === 404) {
        setMsg("Guild not found or token not a member");
      } else if (r.status === 429) {
        setMsg(`Rate limited — retry after ${respJson.retry_after ?? 1}s`);
      } else {
        setMsg(discordMsg || `HTTP ${r.status}`);
      }
    } catch (e) {
      entry.error   = String(e).slice(0, 120);
      entry.message = String(e).slice(0, 120);
    }

    results.push(entry);
    if (delayMs > 0 && i < tokens.length - 1) await sleep(delayMs);
  }

  const successCount = results.filter((r) => r.success).length;
  return {
    ok: true,
    guildId,
    results,
    summary: {
      total: results.length,
      success: successCount,
      failed: results.length - successCount,
    },
  };
}

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

async function validateKeyInternal(client, toolId, key) {
  const normalizedKey = key.trim().toUpperCase();
  let result = await client.query(
    "SELECT * FROM jsk_api_keys WHERE tool_id = $1 AND key = $2 AND is_active = true LIMIT 1",
    [toolId, normalizedKey]
  );
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

// ─── BOT SERVER PROXY (for Onliner only) ─────────────────────────────────────

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

    // ── ADMIN: DELETE KEY ───────────────────────────────────────────────────
    if (method === "DELETE" && path.startsWith("/keys/")) {
      const stored = await getAdminPassword(client);
      if (adminPass !== stored) return json({ error: "Unauthorized" }, 401);
      const keyId = path.replace("/keys/", "");
      const keyRow = await client.query("SELECT key FROM jsk_api_keys WHERE id = $1", [keyId]);
      if (keyRow.rows[0]) {
        stopTokensForKey(keyRow.rows[0].key).catch(() => {});
      }
      await client.query("DELETE FROM jsk_api_keys WHERE id = $1", [keyId]);
      return json({ success: true });
    }

    // ── ADMIN: CLEANUP EXPIRED KEYS ─────────────────────────────────────────
    if (method === "POST" && path === "/admin/cleanup-expired") {
      const stored = await getAdminPassword(client);
      if (adminPass !== stored) return json({ error: "Unauthorized" }, 401);
      const now = Date.now();
      const expired = await client.query(
        "SELECT key FROM jsk_api_keys WHERE (expires_at IS NOT NULL AND expires_at < $1) OR is_active = false",
        [now]
      );
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
    // BOT SERVER PROXY (Onliner only — token keep-alive/presence)
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

    // ── BOT: GET MY TOKENS ───────────────────────────────────────────────────
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

    // ══════════════════════════════════════════════════════════════════════════
    // SERVER JOIN / LEAVE — now handled DIRECTLY (no bothosting proxy)
    // ══════════════════════════════════════════════════════════════════════════

    // ── SERVER JOINER ────────────────────────────────────────────────────────
    if (method === "POST" && path === "/bot/join") {
      const { key, tokens, inviteCode, delayMs } = body;
      if (!key || !tokens || !inviteCode) {
        return json({ error: "key, tokens, and inviteCode required" }, 400);
      }
      const keyResult = await validateKeyInternal(client, "server-joiner", key);
      if (!keyResult.valid) {
        return json({ error: "Invalid or expired key", reason: keyResult.reason }, 401);
      }

      const tokenList = Array.isArray(tokens)
        ? tokens.map((t) => t.trim()).filter(Boolean)
        : String(tokens).split("\n").map((t) => t.trim()).filter(Boolean);

      const code   = extractInviteCode(inviteCode);
      const result = await discordJoin(tokenList, code, delayMs ?? 1500);
      return json(result);
    }

    // ── SERVER LEAVE ─────────────────────────────────────────────────────────
    if (method === "POST" && path === "/bot/leave") {
      const { key, tokens, guildId, delayMs } = body;
      if (!key || !tokens || !guildId) {
        return json({ error: "key, tokens, and guildId required" }, 400);
      }
      const keyResult = await validateKeyInternal(client, "server-joiner", key);
      if (!keyResult.valid) {
        return json({ error: "Invalid or expired key", reason: keyResult.reason }, 401);
      }

      const tokenList = Array.isArray(tokens)
        ? tokens.map((t) => t.trim()).filter(Boolean)
        : String(tokens).split("\n").map((t) => t.trim()).filter(Boolean);

      const result = await discordLeave(tokenList, guildId.trim(), delayMs ?? 1000);
      return json(result);
    }

    // ── BOT: JOIN HISTORY (admin) ────────────────────────────────────────────
    if (method === "GET" && path === "/bot/joins") {
      const stored = await getAdminPassword(client);
      if (adminPass !== stored) return json({ error: "Unauthorized" }, 401);
      // Join history is no longer stored server-side since we're direct
      // Return empty history or you can add DB-based history here
      return json({ ok: true, total: 0, history: [] });
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
