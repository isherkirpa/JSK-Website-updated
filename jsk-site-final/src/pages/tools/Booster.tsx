import { useState, useRef } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, Zap, Users, Hash, Image, FileText, User,
  Play, Loader2, CheckCircle, XCircle, AlertTriangle, Info,
  Upload, X, AtSign,
} from "lucide-react";
import KeyGate from "@/components/KeyGate";
import { boostTokens } from "@/lib/keyManager";

type BoostResult = { token: string; success: boolean; message: string; };
type Summary     = { total: number; success: number; failed: number; };

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function ImagePicker({ label, value, onChange, disabled }: {
  label: string; value: string | null; onChange: (v: string | null) => void; disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { onChange(await fileToBase64(file)); } catch { onChange(null); }
    e.target.value = "";
  };
  return (
    <div>
      <p className="text-xs text-gray-400 mb-2">{label}</p>
      {value ? (
        <div className="relative w-16 h-16 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(179,26,255,0.3)" }}>
          <img src={value} alt={label} className="w-full h-full object-cover" />
          {!disabled && (
            <button onClick={() => onChange(null)}
              className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-500/80 flex items-center justify-center hover:bg-red-500 transition-colors">
              <X size={10} className="text-white" />
            </button>
          )}
        </div>
      ) : (
        <button onClick={() => !disabled && inputRef.current?.click()} disabled={disabled}
          className="w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:border-purple-500/50"
          style={{ background: "rgba(179,26,255,0.07)", border: "1px dashed rgba(179,26,255,0.3)" }}>
          <Upload size={14} className="text-purple-400" />
          <span className="text-gray-600 text-xs">Upload</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

function BoosterTool({ toolKey }: { toolKey: string }) {
  const [tokensInput, setTokensInput] = useState("");
  const [guildId,     setGuildId]     = useState("");
  const [globalName,  setGlobalName]  = useState("");
  const [nick,        setNick]        = useState("");
  const [bio,         setBio]         = useState("");
  const [avatarB64,   setAvatarB64]   = useState<string | null>(null);
  const [bannerB64,   setBannerB64]   = useState<string | null>(null);
  const [delayMs,     setDelayMs]     = useState(500);

  const [running,  setRunning]  = useState(false);
  const [results,  setResults]  = useState<BoostResult[]>([]);
  const [summary,  setSummary]  = useState<Summary | null>(null);
  const [error,    setError]    = useState("");

  const tokens       = tokensInput.split("\n").map((t) => t.trim()).filter(Boolean);
  const limited      = tokens.slice(0, 20);
  const tokenCount   = limited.length;
  const nothingSelected = !globalName.trim() && !nick.trim() && !bio.trim() && !avatarB64 && !bannerB64;

  const handleBoost = async () => {
    if (!limited.length || !guildId.trim() || nothingSelected) return;
    setRunning(true); setError(""); setResults([]); setSummary(null);

    const res = await boostTokens(toolKey, limited, guildId.trim(), {
      globalName:   globalName.trim()  || null,
      nick:         nick.trim()        || null,
      bio:          bio.trim()         || null,
      avatarBase64: avatarB64,
      bannerBase64: bannerB64,
      delayMs,
    });

    if (!res.ok) {
      setError(res.error ?? "Bot server error. Make sure the server is running.");
      setRunning(false);
      return;
    }
    setResults((res.results as BoostResult[]) ?? []);
    setSummary((res.summary as Summary) ?? { total: limited.length, success: 0, failed: limited.length });
    setRunning(false);
  };

  return (
    <div className="pt-16 min-h-screen">
      <div className="hero-bg py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <Link href="/tools" className="inline-flex items-center gap-2 text-gray-400 hover:text-purple-400 text-sm mb-6 transition-colors">
            <ArrowLeft size={16} /> Back to Tools
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: "rgba(179,26,255,0.15)" }}>
              <Zap size={26} className="text-yellow-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white">Profile Booster</h1>
              <p className="text-gray-400 text-sm">Set display name, nick, bio, avatar & banner across multiple Discord tokens</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ─── LEFT: Config ─── */}
          <div className="space-y-5">

            {/* Guild ID */}
            <div className="card-dark rounded-2xl p-5">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <Hash size={16} className="text-purple-400" /> Server / Guild ID
              </h3>
              <input value={guildId} onChange={(e) => setGuildId(e.target.value.trim())}
                placeholder="123456789012345678"
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 outline-none font-mono"
                style={{ background: "rgba(179,26,255,0.07)", border: "1px solid rgba(179,26,255,0.2)" }}
                disabled={running} />
              <p className="text-xs text-gray-600 mt-1.5">Right-click server icon → Copy Server ID (enable Developer Mode)</p>
            </div>

            {/* Tokens */}
            <div className="card-dark rounded-2xl p-5">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <Users size={16} className="text-purple-400" /> Tokens
                <span className="text-xs text-gray-500 font-normal">(one per line)</span>
              </h3>
              <textarea value={tokensInput} onChange={(e) => setTokensInput(e.target.value)} rows={7}
                placeholder={"Token1\nToken2\nToken3"}
                className="w-full px-4 py-3 rounded-xl text-xs text-white placeholder-gray-600 outline-none resize-none font-mono"
                style={{ background: "rgba(179,26,255,0.07)", border: "1px solid rgba(179,26,255,0.2)" }}
                disabled={running} />
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-gray-600">{tokens.length} token{tokens.length !== 1 ? "s" : ""} · max 20 per run</p>
                {tokens.length > 20 && (
                  <p className="text-xs text-yellow-400">Only first 20 will be used</p>
                )}
              </div>
            </div>

            {/* Profile Fields */}
            <div className="card-dark rounded-2xl p-5 space-y-4">
              <h3 className="text-white font-bold flex items-center gap-2">
                <User size={16} className="text-purple-400" /> Profile Changes
                <span className="text-xs text-gray-500 font-normal">(fill only what you want to change)</span>
              </h3>

              {/* Global Display Name */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 flex items-center gap-1.5">
                  <AtSign size={11} /> Global Display Name
                </label>
                <input value={globalName} onChange={(e) => setGlobalName(e.target.value)}
                  placeholder="e.g. CoolUser"
                  maxLength={32}
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
                  style={{ background: "rgba(179,26,255,0.07)", border: "1px solid rgba(179,26,255,0.2)" }}
                  disabled={running} />
                <p className="text-xs text-gray-600 mt-1">Shown everywhere on Discord (requires Nitro on some accounts)</p>
              </div>

              {/* Server Nickname */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 flex items-center gap-1.5">
                  <User size={11} /> Nickname in Server
                </label>
                <input value={nick} onChange={(e) => setNick(e.target.value)}
                  placeholder="e.g. JSK Member"
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
                  style={{ background: "rgba(179,26,255,0.07)", border: "1px solid rgba(179,26,255,0.2)" }}
                  disabled={running} />
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 flex items-center gap-1.5">
                  <FileText size={11} /> Profile Bio
                </label>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3}
                  placeholder="Your bio text..." maxLength={190}
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none resize-none"
                  style={{ background: "rgba(179,26,255,0.07)", border: "1px solid rgba(179,26,255,0.2)" }}
                  disabled={running} />
                <p className="text-xs text-gray-600 mt-1">{bio.length}/190</p>
              </div>

              {/* Avatar + Banner */}
              <div className="flex items-start gap-6">
                <ImagePicker label="Avatar" value={avatarB64} onChange={setAvatarB64} disabled={running} />
                <ImagePicker label="Banner" value={bannerB64} onChange={setBannerB64} disabled={running} />
              </div>
            </div>

            {/* Delay */}
            <div className="card-dark rounded-2xl p-5">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <Zap size={16} className="text-purple-400" /> Delay Between Tokens
              </h3>
              <div className="flex items-center gap-3">
                <input type="range" min={200} max={3000} step={100} value={delayMs}
                  onChange={(e) => setDelayMs(Number(e.target.value))}
                  className="flex-1 accent-purple-500" disabled={running} />
                <span className="text-sm font-bold text-purple-400 w-20 text-right shrink-0">
                  {(delayMs / 1000).toFixed(1)}s
                </span>
              </div>
            </div>

            {/* Info */}
            <div className="card-dark rounded-2xl p-4" style={{ border: "1px solid rgba(59,130,246,0.3)", background: "rgba(59,130,246,0.04)" }}>
              <div className="flex items-start gap-2">
                <Info size={15} className="text-blue-400 mt-0.5 shrink-0" />
                <p className="text-gray-400 text-xs leading-relaxed">
                  Avatar/Banner require <span className="text-purple-300 font-semibold">Nitro</span>.
                  Nick is per-server. Bio and Display Name are global.
                  Leave a field empty to skip it. Max 20 tokens per run.
                </p>
              </div>
            </div>

            {nothingSelected && (
              <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.25)" }}>
                <AlertTriangle size={15} className="text-yellow-400 mt-0.5 shrink-0" />
                <p className="text-yellow-300 text-xs">Fill in at least one profile field to apply.</p>
              </div>
            )}

            {error && (
              <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
                <AlertTriangle size={15} className="text-red-400 mt-0.5 shrink-0" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            <button onClick={handleBoost}
              disabled={running || !tokenCount || !guildId.trim() || nothingSelected}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white gradient-purple glow-btn transition-all hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100">
              {running
                ? <><Loader2 size={16} className="animate-spin" /> Applying Profiles...</>
                : <><Zap size={16} /> Start Boosting ({tokenCount} token{tokenCount !== 1 ? "s" : ""})</>
              }
            </button>
          </div>

          {/* ─── RIGHT: Results ─── */}
          <div className="card-dark rounded-2xl p-5 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Zap size={16} className="text-yellow-400" /> Boost Results
              </h3>
              {summary && (
                <div className="flex gap-3 text-xs">
                  <span className="text-green-400 font-bold">{summary.success} ok</span>
                  {summary.failed > 0 && <span className="text-red-400 font-bold">{summary.failed} failed</span>}
                </div>
              )}
            </div>

            {summary && (
              <div className="mb-4 p-3 rounded-xl" style={{ background: "rgba(179,26,255,0.06)", border: "1px solid rgba(179,26,255,0.15)" }}>
                <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                  <span>Progress</span>
                  <span>{summary.success}/{summary.total}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${(summary.success / summary.total) * 100}%`, background: "linear-gradient(90deg, #7c2dd4, #a855f7)" }} />
                </div>
              </div>
            )}

            {results.length === 0 && !running ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                <Zap size={40} className="text-gray-700 mb-3" />
                <p className="text-gray-600 text-sm">Fill in the config,<br />then click "Start Boosting".</p>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto flex-1 max-h-[560px] pr-1">
                {running && results.length === 0 && (
                  <div className="flex items-center justify-center py-8 gap-3">
                    <Loader2 size={20} className="text-purple-400 animate-spin" />
                    <span className="text-gray-400 text-sm">Applying profiles...</span>
                  </div>
                )}
                {results.map((r, i) => (
                  <div key={i} className="rounded-xl p-3"
                    style={{ background: r.success ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)", border: `1px solid ${r.success ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}` }}>
                    <div className="flex items-start gap-2">
                      {r.success ? <CheckCircle size={15} className="text-green-400 mt-0.5 shrink-0" /> : <XCircle size={15} className="text-red-400 mt-0.5 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono text-gray-400 truncate">{r.token}</p>
                        <p className={`text-xs mt-0.5 ${r.success ? "text-green-300" : "text-red-300"}`}>{r.message}</p>
                      </div>
                    </div>
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

export default function Booster() {
  return (
    <KeyGate toolId="booster" toolName="Profile Booster">
      {(key) => <BoosterTool toolKey={key} />}
    </KeyGate>
  );
}
