import { useState, useEffect, useCallback } from "react";
import {
  Shield, Key, Copy, Trash2, Plus, Eye, EyeOff,
  Check, Lock, RefreshCw, LogOut, Settings, Wifi,
  Clock, AlertTriangle, Loader2, Server, Activity,
  Users, Hash, CheckCircle, XCircle, Zap,
} from "lucide-react";
import {
  checkAdminPassword, setAdminPassword, getAllEntries,
  createKey, deleteKey, isKeyExpired, getBotStatus, getJoinHistory,
  TOOL_LABELS, EXPIRY_LABELS,
  type ToolId, type KeyEntry,
} from "@/lib/keyManager";

const TOOL_IDS: ToolId[] = ["mass-dm", "token-checker", "onliner", "server-joiner", "booster"];
const EXPIRY_OPTIONS = [-1, 1, 6, 12, 24, 72, 168, 720];

function avatarUrl(id: string, avatar: string | null) {
  if (!avatar) return `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(id) % 6n)}.png`;
  return `https://cdn.discordapp.com/avatars/${id}/${avatar}.${avatar.startsWith("a_") ? "gif" : "png"}?size=64`;
}

function formatExpiry(entry: KeyEntry): { label: string; expired: boolean; warn: boolean } {
  if (!entry.expiresAt) return { label: "Never", expired: false, warn: false };
  const diff = entry.expiresAt - Date.now();
  if (diff <= 0) return { label: "Expired", expired: true, warn: false };
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const warn = h < 6;
  if (h >= 24) return { label: `${Math.floor(h / 24)}d ${h % 24}h left`, expired: false, warn };
  if (h > 0)  return { label: `${h}h ${m}m left`,                        expired: false, warn };
  return { label: `${m}m left`, expired: false, warn: true };
}

type BotToken = {
  status: string;
  username?: string;
  userId?: string;
  avatar?: string;
  presence?: string;
  currentStatusText?: string;
  error?: string;
  tokenPreview?: string;
  startedAt?: number;
};

type JoinEntry = {
  invite: string;
  total: number;
  success: number;
  timestamp: number;
  results: { token: string; success: boolean; guild?: string; error?: string }[];
};

export default function Admin() {
  const [authed,        setAuthed]        = useState(false);
  const [adminPass,     setAdminPassState] = useState("");
  const [passInput,     setPassInput]      = useState("");
  const [showPass,      setShowPass]       = useState(false);
  const [passError,     setPassError]      = useState("");
  const [loggingIn,     setLoggingIn]      = useState(false);
  const [entries,       setEntries]        = useState<Record<ToolId, KeyEntry[]>>({
    "mass-dm": [], "token-checker": [], onliner: [], "server-joiner": [], booster: [],
  });
  const [loading,       setLoading]        = useState(false);
  const [copied,        setCopied]         = useState<string | null>(null);
  const [newPass,       setNewPass]        = useState("");
  const [newPassConfirm, setNewPassConfirm] = useState("");
  const [passMsg,       setPassMsg]        = useState("");
  const [activeTab,     setActiveTab]      = useState<ToolId | "bot-status" | "join-history" | "settings">("mass-dm");
  const [selectedExpiry, setSelectedExpiry] = useState<number>(-1);
  const [creating,      setCreating]       = useState(false);
  const [botTokens,     setBotTokens]      = useState<BotToken[]>([]);
  const [botLoading,    setBotLoading]     = useState(false);
  const [joinHistory,   setJoinHistory]    = useState<JoinEntry[]>([]);
  const [joinLoading,   setJoinLoading]    = useState(false);

  const refreshAll = useCallback(async (pass: string) => {
    setLoading(true);
    const updated = await getAllEntries(pass);
    setEntries(updated);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authed) void refreshAll(adminPass);
  }, [authed, adminPass, refreshAll]);

  const loadBotStatus = useCallback(async () => {
    setBotLoading(true);
    const res = await getBotStatus(adminPass);
    if (res.ok && res.tokens) setBotTokens(res.tokens as BotToken[]);
    setBotLoading(false);
  }, [adminPass]);

  const loadJoinHistory = useCallback(async () => {
    setJoinLoading(true);
    const res = await getJoinHistory(adminPass);
    if (res.ok && res.history) setJoinHistory(res.history as JoinEntry[]);
    setJoinLoading(false);
  }, [adminPass]);

  useEffect(() => {
    if (authed && activeTab === "bot-status")   void loadBotStatus();
    if (authed && activeTab === "join-history") void loadJoinHistory();
  }, [authed, activeTab, loadBotStatus, loadJoinHistory]);

  const handleLogin = async () => {
    setLoggingIn(true);
    setPassError("");
    const ok = await checkAdminPassword(passInput);
    setLoggingIn(false);
    if (ok) {
      setAdminPassState(passInput);
      setAuthed(true);
    } else {
      setPassError("Wrong password.");
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 1500);
  };

  const handleCreate = async (toolId: ToolId) => {
    setCreating(true);
    const entry = await createKey(toolId, selectedExpiry, adminPass);
    if (entry) {
      setEntries((prev) => ({ ...prev, [toolId]: [entry, ...prev[toolId]] }));
    }
    setCreating(false);
  };

  const handleDelete = async (id: number, toolId: ToolId) => {
    const ok = await deleteKey(id, adminPass);
    if (ok) setEntries((prev) => ({ ...prev, [toolId]: prev[toolId].filter((e) => e.id !== id) }));
  };

  const handleChangePass = async () => {
    if (newPass !== newPassConfirm) { setPassMsg("Passwords don't match."); return; }
    if (newPass.length < 6) { setPassMsg("Password must be at least 6 characters."); return; }
    const result = await setAdminPassword(adminPass, newPass);
    if (result.success) {
      setAdminPassState(newPass);
      setPassMsg("Password changed successfully!");
      setNewPass("");
      setNewPassConfirm("");
    } else {
      setPassMsg(result.error ?? "Failed to change password.");
    }
  };

  if (!authed) {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 gradient-purple">
              <Shield size={28} className="text-white" />
            </div>
            <h2 className="text-2xl font-black text-white mb-1">Admin Panel</h2>
            <p className="text-gray-400 text-sm">Enter admin password to continue</p>
          </div>
          <div className="card-dark rounded-2xl p-6 space-y-4">
            <div className="relative">
              <input type={showPass ? "text" : "password"} value={passInput}
                onChange={(e) => setPassInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="Admin password"
                className="w-full px-4 py-3 pr-12 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
                style={{ background: "rgba(179,26,255,0.07)", border: `1px solid ${passError ? "rgba(239,68,68,0.5)" : "rgba(179,26,255,0.2)"}` }} />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {passError && <p className="text-red-400 text-xs">{passError}</p>}
            <button onClick={handleLogin} disabled={loggingIn || !passInput}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white gradient-purple glow-btn transition-all hover:scale-105 disabled:opacity-40">
              {loggingIn ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
              {loggingIn ? "Verifying..." : "Login"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentToolEntries = TOOL_IDS.includes(activeTab as ToolId) ? entries[activeTab as ToolId] : [];
  const STATUS_COLORS: Record<string, string> = { online: "#23d160", idle: "#f5a623", dnd: "#ed4245", invisible: "#747f8d", connected: "#23d160" };

  const toolIcons: Record<string, React.ReactNode> = {
    "mass-dm": <Key size={13} />,
    "token-checker": <Key size={13} />,
    onliner: <Wifi size={13} />,
    "server-joiner": <Server size={13} />,
    booster: <Zap size={13} />,
  };

  return (
    <div className="pt-16 min-h-screen">
      <div className="hero-bg py-10 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
              <Shield size={28} className="text-purple-400" /> Admin Panel
            </h1>
            <p className="text-gray-400 text-sm mt-1">Manage keys, bot server, and join history</p>
          </div>
          <button onClick={() => setAuthed(false)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-red-400 transition-colors"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-1 flex-wrap mb-8 p-1 rounded-xl" style={{ background: "rgba(179,26,255,0.06)", border: "1px solid rgba(179,26,255,0.12)" }}>
          {TOOL_IDS.map((tid) => (
            <button key={tid} onClick={() => setActiveTab(tid)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === tid ? "gradient-purple text-white" : "text-gray-400 hover:text-white"}`}>
              {toolIcons[tid]} {TOOL_LABELS[tid]}
              <span className="ml-1 text-xs opacity-70">({entries[tid].length})</span>
            </button>
          ))}
          <button onClick={() => setActiveTab("bot-status")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "bot-status" ? "gradient-purple text-white" : "text-gray-400 hover:text-white"}`}>
            <Server size={13} /> Bot Server
          </button>
          <button onClick={() => setActiveTab("join-history")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "join-history" ? "gradient-purple text-white" : "text-gray-400 hover:text-white"}`}>
            <Activity size={13} /> Join History
          </button>
          <button onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "settings" ? "gradient-purple text-white" : "text-gray-400 hover:text-white"}`}>
            <Settings size={13} /> Settings
          </button>
        </div>

        {/* ── KEY MANAGEMENT TABS ── */}
        {TOOL_IDS.includes(activeTab as ToolId) && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-xl font-bold text-white">{TOOL_LABELS[activeTab as ToolId]} — Keys</h2>
                <p className="text-gray-500 text-sm mt-0.5">{currentToolEntries.length} key{currentToolEntries.length !== 1 ? "s" : ""} total</p>
              </div>
              <div className="flex items-center gap-3">
                <select value={selectedExpiry} onChange={(e) => setSelectedExpiry(Number(e.target.value))}
                  className="px-3 py-2 rounded-xl text-sm text-white outline-none"
                  style={{ background: "rgba(179,26,255,0.1)", border: "1px solid rgba(179,26,255,0.2)" }}>
                  {EXPIRY_OPTIONS.map((h) => (
                    <option key={h} value={h}>{EXPIRY_LABELS[h]}</option>
                  ))}
                </select>
                <button onClick={() => handleCreate(activeTab as ToolId)} disabled={creating}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white gradient-purple glow-btn transition-all hover:scale-105 disabled:opacity-40">
                  {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  {creating ? "Creating..." : "Create Key"}
                </button>
                <button onClick={() => refreshAll(adminPass)} disabled={loading}
                  className="p-2 rounded-xl text-gray-400 hover:text-white transition-colors"
                  style={{ background: "rgba(179,26,255,0.08)", border: "1px solid rgba(179,26,255,0.15)" }}>
                  <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {loading && currentToolEntries.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="text-purple-400 animate-spin" />
                </div>
              ) : currentToolEntries.length === 0 ? (
                <div className="text-center py-12">
                  <Key size={40} className="text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500">No keys yet. Click "Create Key" to generate one.</p>
                </div>
              ) : (
                currentToolEntries.map((entry) => {
                  const expiry  = formatExpiry(entry);
                  const expired = expiry.expired || isKeyExpired(entry);
                  return (
                    <div key={entry.id} className="card-dark rounded-2xl p-4 flex items-center gap-4 flex-wrap"
                      style={{ border: `1px solid ${expired ? "rgba(239,68,68,0.25)" : "rgba(179,26,255,0.15)"}`, opacity: expired ? 0.6 : 1 }}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <code className="text-purple-300 font-mono text-sm tracking-widest">{entry.key}</code>
                          <button onClick={() => handleCopy(entry.key)}
                            className="text-gray-500 hover:text-purple-400 transition-colors">
                            {copied === entry.key ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                          </button>
                          {expired && <span className="text-xs px-2 py-0.5 rounded-full text-red-400" style={{ background: "rgba(239,68,68,0.15)" }}>Expired</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            {expiry.warn ? <span className="text-yellow-400">{expiry.label}</span> : expiry.label}
                          </span>
                          <span>Created {new Date(entry.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <button onClick={() => handleDelete(entry.id, activeTab as ToolId)}
                        className="p-2 text-gray-600 hover:text-red-400 transition-colors rounded-xl hover:bg-red-400/10">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ── BOT SERVER STATUS ── */}
        {activeTab === "bot-status" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Bot Server — Live Tokens</h2>
                <p className="text-gray-500 text-sm mt-0.5">Tokens currently running 24/7 on bothosting.net</p>
              </div>
              <button onClick={loadBotStatus} disabled={botLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: "rgba(179,26,255,0.12)", border: "1px solid rgba(179,26,255,0.2)" }}>
                <RefreshCw size={14} className={botLoading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>

            {botLoading ? (
              <div className="flex items-center justify-center py-16"><Loader2 size={28} className="text-purple-400 animate-spin" /></div>
            ) : botTokens.length === 0 ? (
              <div className="text-center py-16">
                <Server size={44} className="text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No active tokens on bot server.</p>
                <p className="text-gray-600 text-xs mt-1">Make sure BOT_SERVER_URL is set in Netlify env vars.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {botTokens.map((bt, i) => (
                  <div key={i} className="card-dark rounded-2xl p-4"
                    style={{ border: `1px solid ${bt.status === "connected" ? "rgba(34,197,94,0.25)" : bt.status === "error" ? "rgba(239,68,68,0.25)" : "rgba(179,26,255,0.15)"}` }}>
                    <div className="flex items-center gap-3 mb-3">
                      {bt.avatar && bt.userId
                        ? <img src={avatarUrl(bt.userId, bt.avatar)} alt="" className="w-10 h-10 rounded-full object-cover" />
                        : <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold gradient-purple shrink-0 text-white">
                            {bt.username ? bt.username[0].toUpperCase() : "?"}
                          </div>}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {bt.presence && <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[bt.presence] ?? "#747f8d" }} />}
                          <span className="text-white font-semibold text-sm truncate">{bt.username ?? "Unknown"}</span>
                        </div>
                        <span className={`text-xs ${bt.status === "connected" ? "text-green-400" : bt.status === "error" ? "text-red-400" : "text-gray-500"}`}>
                          {bt.status === "connected" ? "24/7 Live" : bt.status}
                        </span>
                      </div>
                    </div>
                    {bt.currentStatusText && <p className="text-purple-300 text-xs truncate">{bt.currentStatusText}</p>}
                    {bt.error && <p className="text-red-400 text-xs truncate">{bt.error}</p>}
                    <p className="text-gray-700 text-xs font-mono mt-1 truncate">{bt.tokenPreview}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── JOIN HISTORY ── */}
        {activeTab === "join-history" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Server Join History</h2>
                <p className="text-gray-500 text-sm mt-0.5">Recent server join operations</p>
              </div>
              <button onClick={loadJoinHistory} disabled={joinLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                style={{ background: "rgba(179,26,255,0.12)", border: "1px solid rgba(179,26,255,0.2)" }}>
                <RefreshCw size={14} className={joinLoading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>

            {joinLoading ? (
              <div className="flex items-center justify-center py-16"><Loader2 size={28} className="text-purple-400 animate-spin" /></div>
            ) : joinHistory.length === 0 ? (
              <div className="text-center py-16">
                <Hash size={44} className="text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No join history yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {[...joinHistory].reverse().map((entry, i) => (
                  <div key={i} className="card-dark rounded-2xl p-5" style={{ border: "1px solid rgba(179,26,255,0.15)" }}>
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Hash size={14} className="text-purple-400" />
                        <span className="text-white font-bold font-mono">{entry.invite}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-green-400 font-bold">{entry.success}/{entry.total} joined</span>
                        <span className="text-gray-500">{new Date(entry.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {entry.results?.map((r, j) => (
                        <div key={j} className="flex items-center gap-2 text-xs">
                          {r.success
                            ? <CheckCircle size={12} className="text-green-400 shrink-0" />
                            : <XCircle    size={12} className="text-red-400 shrink-0" />}
                          <span className="font-mono text-gray-500 truncate">{r.token}</span>
                          {r.success && r.guild && <span className="text-green-300 font-semibold shrink-0">{r.guild}</span>}
                          {!r.success && r.error && <span className="text-red-400 shrink-0">{r.error}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SETTINGS ── */}
        {activeTab === "settings" && (
          <div className="max-w-lg space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Settings</h2>
              <p className="text-gray-500 text-sm">Manage admin password and configuration</p>
            </div>

            <div className="card-dark rounded-2xl p-6 space-y-4">
              <h3 className="text-white font-bold flex items-center gap-2"><Lock size={15} className="text-purple-400" /> Change Password</h3>
              <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)}
                placeholder="New password"
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
                style={{ background: "rgba(179,26,255,0.07)", border: "1px solid rgba(179,26,255,0.2)" }} />
              <input type="password" value={newPassConfirm} onChange={(e) => setNewPassConfirm(e.target.value)}
                placeholder="Confirm new password"
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
                style={{ background: "rgba(179,26,255,0.07)", border: "1px solid rgba(179,26,255,0.2)" }} />
              {passMsg && (
                <p className={`text-sm ${passMsg.includes("success") ? "text-green-400" : "text-red-400"}`}>{passMsg}</p>
              )}
              <button onClick={handleChangePass}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white gradient-purple glow-btn transition-all hover:scale-105">
                <Check size={14} /> Update Password
              </button>
            </div>

            <div className="card-dark rounded-2xl p-5" style={{ border: "1px solid rgba(59,130,246,0.2)", background: "rgba(59,130,246,0.04)" }}>
              <h3 className="text-blue-300 font-bold text-sm mb-2 flex items-center gap-2"><Settings size={14} /> Bot Server Setup</h3>
              <p className="text-gray-400 text-xs leading-relaxed">Add these environment variables in Netlify:</p>
              <div className="mt-2 space-y-1">
                {[
                  ["BOT_SERVER_URL", "https://prem-eu3.bot-hosting.net:20367"],
                  ["BOT_SERVER_SECRET", "same as API_SECRET in bot server .env"],
                  ["DATABASE_URL", "your Neon PostgreSQL connection string"],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg p-2 font-mono text-xs" style={{ background: "rgba(0,0,0,0.3)" }}>
                    <span className="text-purple-400">{k}</span>
                    <span className="text-gray-600"> = </span>
                    <span className="text-gray-400">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
