import { useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, ShieldCheck, CheckCircle2, XCircle,
  Loader2, Play, Trash2, Copy, Check, User, Server, Calendar, Zap,
} from "lucide-react";
import KeyGate from "@/components/KeyGate";

const DISCORD_EPOCH = 1420070400000n;

function snowflakeToDate(id: string): Date {
  try {
    return new Date(Number((BigInt(id) >> 22n) + DISCORD_EPOCH));
  } catch {
    return new Date();
  }
}

function formatAge(ms: number): string {
  const days  = Math.floor(ms / 86400000);
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  if (years > 0) return `${years}y ${months}m`;
  if (days >= 30) return `${months}mo ${days % 30}d`;
  return `${days}d`;
}

function nitroPlan(type: number): string {
  return ["No Nitro", "Nitro Classic", "Nitro", "Nitro Basic"][type] ?? "Unknown";
}

function avatarUrl(id: string, hash: string | null): string {
  if (!hash) return `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(id) % 5n)}.png`;
  const ext = hash.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${id}/${hash}.${ext}?size=128`;
}

type TokenResult = {
  token: string;
  status: "pending" | "checking" | "valid" | "invalid";
  username?: string;
  global_name?: string;
  id?: string;
  email?: string;
  phone?: string;
  mfa?: boolean;
  avatar?: string | null;
  nitro?: number;
  createdAt?: Date;
  serverCount?: number;
};

async function checkToken(token: string): Promise<Omit<TokenResult, "token" | "status">> {
  const headers = { Authorization: token.trim() };

  const [meRes, guildsRes] = await Promise.allSettled([
    fetch("https://discord.com/api/v9/users/@me", { headers }),
    fetch("https://discord.com/api/v9/users/@me/guilds?with_counts=true", { headers }),
  ]);

  if (meRes.status === "rejected" || !(meRes.value as Response).ok) {
    throw new Error(`HTTP ${(meRes.value as Response)?.status ?? "network error"}`);
  }

  const data = await (meRes.value as Response).json();
  let serverCount: number | undefined;

  if (guildsRes.status === "fulfilled" && (guildsRes.value as Response).ok) {
    const guilds = await (guildsRes.value as Response).json();
    if (Array.isArray(guilds)) serverCount = guilds.length;
  }

  return {
    username:     data.username,
    global_name:  data.global_name || data.username,
    id:           data.id,
    email:        data.email || "Hidden",
    phone:        data.phone ?? "None",
    mfa:          data.mfa_enabled,
    avatar:       data.avatar ?? null,
    nitro:        data.premium_type ?? 0,
    createdAt:    snowflakeToDate(data.id),
    serverCount,
  };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function TokenCheckerTool() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState<TokenResult[]>([]);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const handleCheck = async () => {
    const lines = input.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return;

    const initial: TokenResult[] = lines.map((t) => ({ token: t, status: "pending" }));
    setResults(initial);
    setRunning(true);

    const updated = [...initial];
    for (let i = 0; i < updated.length; i++) {
      updated[i] = { ...updated[i], status: "checking" };
      setResults([...updated]);
      try {
        const info = await checkToken(updated[i].token);
        updated[i] = { ...updated[i], status: "valid", ...info };
      } catch {
        updated[i] = { ...updated[i], status: "invalid" };
      }
      setResults([...updated]);
      if (i < updated.length - 1) await sleep(400);
    }

    setRunning(false);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCopyValid = () => {
    const valid = results.filter((r) => r.status === "valid").map((r) => r.token).join("\n");
    if (valid) handleCopy(valid);
  };

  const valid   = results.filter((r) => r.status === "valid").length;
  const invalid = results.filter((r) => r.status === "invalid").length;

  return (
    <div className="pt-16 min-h-screen">
      <div className="hero-bg py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <Link href="/tools" className="inline-flex items-center gap-2 text-gray-400 hover:text-purple-400 text-sm mb-6 transition-colors">
            <ArrowLeft size={16} /> Back to Tools
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: "rgba(179,26,255,0.15)" }}>
              <ShieldCheck size={26} className="text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white">Token Checker</h1>
              <p className="text-gray-400 text-sm">Verify Discord tokens — see full account info, nitro, servers &amp; more</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card-dark rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-bold text-lg">Token Input</h2>
              <button
                onClick={() => { setInput(""); setResults([]); }}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-400 transition-colors"
              >
                <Trash2 size={12} /> Clear
              </button>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={12}
              placeholder={"Paste tokens here — one per line:\n\nToken1\nToken2\nToken3\n..."}
              className="w-full px-4 py-3 rounded-xl text-xs text-white placeholder-gray-600 outline-none resize-none font-mono leading-relaxed"
              style={{ background: "rgba(179,26,255,0.08)", border: "1px solid rgba(179,26,255,0.2)" }}
              disabled={running}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {input.split("\n").filter(Boolean).length} tokens
              </span>
              <button
                onClick={handleCheck}
                disabled={!input.trim() || running}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white gradient-purple glow-btn transition-all duration-200 hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                {running ? "Checking..." : "Check Tokens"}
              </button>
            </div>
          </div>

          <div className="card-dark rounded-2xl p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold text-lg">Results</h2>
              {results.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-green-400 text-xs font-bold">{valid} valid</span>
                  <span className="text-red-400 text-xs font-bold">{invalid} invalid</span>
                  {valid > 0 && (
                    <button
                      onClick={handleCopyValid}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-300 hover:text-green-400 transition-colors"
                      style={{ background: "rgba(255,255,255,0.05)" }}
                    >
                      {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                      Copy Valid
                    </button>
                  )}
                </div>
              )}
            </div>

            {results.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
                <ShieldCheck size={40} className="text-gray-700 mb-3" />
                <p className="text-gray-600 text-sm">Paste tokens and click<br />"Check Tokens" to begin.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-3 max-h-[520px] pr-1">
                {results.map((r, i) => (
                  <div
                    key={i}
                    className="rounded-xl p-3"
                    style={{
                      background: r.status === "valid"
                        ? "rgba(34,197,94,0.08)"
                        : r.status === "invalid"
                        ? "rgba(239,68,68,0.08)"
                        : "rgba(179,26,255,0.06)",
                      border: `1px solid ${r.status === "valid" ? "rgba(34,197,94,0.2)" : r.status === "invalid" ? "rgba(239,68,68,0.2)" : "rgba(179,26,255,0.1)"}`,
                    }}
                  >
                    {/* Header row */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {r.status === "checking" && <Loader2 size={14} className="text-purple-400 animate-spin" />}
                        {r.status === "valid"    && <CheckCircle2 size={14} className="text-green-400" />}
                        {r.status === "invalid"  && <XCircle size={14} className="text-red-400" />}
                        {r.status === "pending"  && <div className="w-3.5 h-3.5 rounded-full bg-gray-600" />}
                        <span className={`text-xs font-semibold ${r.status === "valid" ? "text-green-400" : r.status === "invalid" ? "text-red-400" : r.status === "checking" ? "text-purple-400" : "text-gray-500"}`}>
                          {r.status === "valid" ? "Valid" : r.status === "invalid" ? "Invalid" : r.status === "checking" ? "Checking..." : "Pending"}
                        </span>
                      </div>
                      <button onClick={() => handleCopy(r.token)} className="text-gray-600 hover:text-gray-300 transition-colors">
                        {copied === r.token ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                      </button>
                    </div>

                    <p className="font-mono text-xs text-gray-500 truncate mb-2">{r.token.slice(0, 40)}...</p>

                    {r.status === "valid" && r.id && (
                      <div className="flex items-start gap-3 mt-2">
                        {/* Avatar */}
                        <img
                          src={avatarUrl(r.id!, r.avatar!)}
                          alt="avatar"
                          className="w-10 h-10 rounded-full shrink-0 border"
                          style={{ borderColor: "rgba(179,26,255,0.3)" }}
                          onError={(e) => { (e.target as HTMLImageElement).src = `https://cdn.discordapp.com/embed/avatars/0.png`; }}
                        />
                        <div className="flex-1 min-w-0">
                          {/* Username + global name */}
                          <p className="text-white text-xs font-bold truncate">{r.global_name || r.username}</p>
                          <p className="text-gray-500 text-xs truncate">@{r.username}</p>

                          {/* Data grid */}
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <User size={10} className="text-purple-400" />
                              ID: <span className="text-purple-300 font-mono">{r.id}</span>
                            </span>
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Calendar size={10} className="text-blue-400" />
                              Age: <span className="text-blue-300">{formatAge(Date.now() - (r.createdAt?.getTime() ?? 0))}</span>
                            </span>
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Zap size={10} className={r.nitro ? "text-yellow-400" : "text-gray-600"} />
                              <span className={r.nitro ? "text-yellow-300" : "text-gray-500"}>{nitroPlan(r.nitro ?? 0)}</span>
                            </span>
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Server size={10} className="text-pink-400" />
                              Servers: <span className="text-pink-300">{r.serverCount ?? "—"}</span>
                            </span>
                            <span className="text-xs text-gray-400">Email: <span className="text-gray-300">{r.email}</span></span>
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                                📱 Phone: <span className={r.phone !== "None" ? "text-green-300 font-mono" : "text-gray-500"}>{r.phone !== "None" ? r.phone : "None"}</span>
                              </span>
                            <span className="text-xs text-gray-400">2FA: <span className={r.mfa ? "text-green-400" : "text-gray-500"}>{r.mfa ? "Enabled" : "Disabled"}</span></span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TokenChecker() {
  return (
    <KeyGate toolId="token-checker" toolName="Token Checker">
      <TokenCheckerTool />
    </KeyGate>
  );
}
