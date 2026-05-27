const NETLIFY_FN = "/.netlify/functions/jsk";

export type ToolId = "mass-dm" | "token-checker" | "onliner" | "server-joiner" | "booster";
export const TOOL_LABELS: Record<ToolId, string> = {
  "mass-dm": "Mass DM Sender",
  "token-checker": "Token Checker",
  onliner: "Discord Onliner",
  "server-joiner": "Server Joiner",
  booster: "Profile Booster",
};
export type KeyExpiry = 1 | 6 | 12 | 24 | 72 | 168 | 720 | -1;
export const EXPIRY_LABELS: Record<number, string> = {
  1: "1 Hour", 6: "6 Hours", 12: "12 Hours", 24: "1 Day",
  72: "3 Days", 168: "7 Days", 720: "30 Days", [-1]: "Never",
};
export type KeyEntry = { id: number; key: string; toolId: string; createdAt: number; expiresAt: number | null; isActive: boolean; };
export type ValidateResult = { valid: boolean; expiresAt?: number | null; createdAt?: number; reason?: string; };

export async function checkAdminPassword(pass: string): Promise<boolean> {
  const res = await fetch(`${NETLIFY_FN}/admin/verify`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pass }) });
  return (await res.json()).valid === true;
}
export async function setAdminPassword(currentPass: string, newPass: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${NETLIFY_FN}/admin/password`, { method: "POST", headers: { "Content-Type": "application/json", "x-admin-password": currentPass }, body: JSON.stringify({ newPassword: newPass }) });
  return await res.json();
}
export async function getAllEntries(adminPass: string): Promise<Record<ToolId, KeyEntry[]>> {
  const res = await fetch(`${NETLIFY_FN}/keys`, { headers: { "x-admin-password": adminPass } });
  const data = await res.json();
  const result: Record<ToolId, KeyEntry[]> = { "mass-dm": [], "token-checker": [], onliner: [], "server-joiner": [], booster: [] };
  for (const entry of data.keys ?? []) { const id = entry.toolId as ToolId; if (result[id]) result[id].push(entry); }
  return result;
}
export function isKeyExpired(entry: KeyEntry): boolean { return entry.expiresAt !== null && Date.now() > entry.expiresAt; }
export async function createKey(toolId: ToolId, expiryHours: number, adminPass: string): Promise<KeyEntry | null> {
  const res = await fetch(`${NETLIFY_FN}/keys`, { method: "POST", headers: { "Content-Type": "application/json", "x-admin-password": adminPass }, body: JSON.stringify({ toolId, expiryHours }) });
  return await res.json();
}
export async function deleteKey(id: number, adminPass: string): Promise<boolean> {
  const res = await fetch(`${NETLIFY_FN}/keys/${id}`, { method: "DELETE", headers: { "x-admin-password": adminPass } });
  return (await res.json()).success === true;
}
export async function validateKey(toolId: ToolId, key: string): Promise<ValidateResult> {
  const res = await fetch(`${NETLIFY_FN}/validate-key`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ toolId, key }) });
  return await res.json();
}
export async function botStartToken(key: string, token: string, settings: Record<string, unknown>): Promise<{ ok: boolean; tid?: string; error?: string }> {
  try {
    const res = await fetch(`${NETLIFY_FN}/bot/start`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, token, settings }) });
    return await res.json();
  } catch (e) { return { ok: false, error: String(e) }; }
}
export async function botStopToken(key: string, token: string, tid?: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${NETLIFY_FN}/bot/stop`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, token, tid }) });
    return await res.json();
  } catch (e) { return { ok: false, error: String(e) }; }
}
export async function getBotStatus(adminPass: string): Promise<{ ok: boolean; tokens?: unknown[]; error?: string }> {
  try {
    const res = await fetch(`${NETLIFY_FN}/bot/status`, { headers: { "x-admin-password": adminPass } });
    return await res.json();
  } catch (e) { return { ok: false, error: String(e) }; }
}
export async function serverJoin(key: string, tokens: string[], inviteCode: string, delayMs = 1500): Promise<{ ok: boolean; results?: unknown[]; summary?: unknown; error?: string }> {
  try {
    const res = await fetch(`${NETLIFY_FN}/bot/join`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, tokens, inviteCode, delayMs }) });
    return await res.json();
  } catch (e) { return { ok: false, error: String(e) }; }
}
export async function serverLeave(key: string, tokens: string[], guildId: string, delayMs = 1000): Promise<{ ok: boolean; results?: unknown[]; summary?: unknown; error?: string }> {
  try {
    const res = await fetch(`${NETLIFY_FN}/bot/leave`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, tokens, guildId, delayMs }) });
    return await res.json();
  } catch (e) { return { ok: false, error: String(e) }; }
}
export async function boostTokens(
  key: string,
  tokens: string[],
  guildId: string,
  opts: { nick?: string | null; bio?: string | null; avatarBase64?: string | null; bannerBase64?: string | null; delayMs?: number }
): Promise<{ ok: boolean; results?: unknown[]; summary?: unknown; error?: string }> {
  try {
    const res = await fetch(`${NETLIFY_FN}/bot/boost`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, tokens, guildId, ...opts }),
    });
    return await res.json();
  } catch (e) { return { ok: false, error: String(e) }; }
}
export async function getJoinHistory(adminPass: string): Promise<{ ok: boolean; history?: unknown[]; error?: string }> {
  try {
    const res = await fetch(`${NETLIFY_FN}/bot/joins`, { headers: { "x-admin-password": adminPass } });
    return await res.json();
  } catch (e) { return { ok: false, error: String(e) }; }
}
export function getOnlinerSessions(): unknown[] { return []; }
