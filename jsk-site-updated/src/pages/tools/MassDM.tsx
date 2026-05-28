import { useState, useRef } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, Send, AlertTriangle, CheckCircle2,
  XCircle, Loader2, User, MessageSquare, Clock, Play, StopCircle
} from "lucide-react";
import KeyGate from "@/components/KeyGate";

type Friend = {
  id: string;
  username: string;
  status: "pending" | "sending" | "sent" | "failed";
  error?: string;
};

type LogEntry = {
  time: string;
  type: "info" | "success" | "error";
  msg: string;
};

async function getFriends(token: string): Promise<Array<{ id: string; user: { id: string; username: string; discriminator: string } }>> {
  const res = await fetch("https://discord.com/api/v9/users/@me/relationships", {
    headers: { Authorization: token },
  });
  if (!res.ok) throw new Error(`Failed to fetch friends: ${res.status}`);
  const data = await res.json();
  return data.filter((r: { type: number }) => r.type === 1);
}

async function openDMChannel(token: string, userId: string): Promise<string> {
  const res = await fetch("https://discord.com/api/v9/users/@me/channels", {
    method: "POST",
    headers: { Authorization: token, "Content-Type": "application/json" },
    body: JSON.stringify({ recipient_id: userId }),
  });
  if (!res.ok) throw new Error(`Failed to open DM: ${res.status}`);
  const data = await res.json();
  return data.id;
}

async function sendMessage(token: string, channelId: string, message: string): Promise<void> {
  const res = await fetch(`https://discord.com/api/v9/channels/${channelId}/messages`, {
    method: "POST",
    headers: { Authorization: token, "Content-Type": "application/json" },
    body: JSON.stringify({ content: message }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || `HTTP ${res.status}`);
  }
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function MassDMTool() {
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [delay, setDelay] = useState(2000);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<"idle" | "fetching" | "sending" | "done">("idle");
  const stopRef = useRef(false);

  const addLog = (type: LogEntry["type"], msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [{ time, type, msg }, ...prev]);
  };

  const handleFetch = async () => {
    if (!token.trim()) return;
    setPhase("fetching");
    setLogs([]);
    setFriends([]);
    addLog("info", "Fetching friends list...");
    try {
      const rels = await getFriends(token);
      if (rels.length === 0) {
        addLog("error", "No friends found or invalid token.");
        setPhase("idle");
        return;
      }
      const list: Friend[] = rels.map((r) => ({
        id: r.user.id,
        username: r.user.username,
        status: "pending",
      }));
      setFriends(list);
      addLog("success", `Found ${list.length} friends. Ready to send!`);
      setPhase("idle");
    } catch (e: unknown) {
      addLog("error", `Error: ${e instanceof Error ? e.message : String(e)}`);
      setPhase("idle");
    }
  };

  const handleSend = async () => {
    if (!token.trim() || !message.trim() || friends.length === 0) return;
    setRunning(true);
    stopRef.current = false;
    setPhase("sending");
    addLog("info", `Starting mass DM — ${friends.length} friends, ${delay}ms delay`);

    const updated = [...friends];
    for (let i = 0; i < updated.length; i++) {
      if (stopRef.current) {
        addLog("info", "Stopped by user.");
        break;
      }
      updated[i] = { ...updated[i], status: "sending" };
      setFriends([...updated]);
      try {
        const channelId = await openDMChannel(token, updated[i].id);
        await sendMessage(token, channelId, message);
        updated[i] = { ...updated[i], status: "sent" };
        addLog("success", `Sent to ${updated[i].username}`);
      } catch (e: unknown) {
        const errMsg = e instanceof Error ? e.message : String(e);
        updated[i] = { ...updated[i], status: "failed", error: errMsg };
        addLog("error", `Failed ${updated[i].username}: ${errMsg}`);
      }
      setFriends([...updated]);
      if (i < updated.length - 1) await sleep(delay);
    }

    setRunning(false);
    setPhase("done");
    const sent = updated.filter((f) => f.status === "sent").length;
    const failed = updated.filter((f) => f.status === "failed").length;
    addLog("info", `Done! Sent: ${sent}, Failed: ${failed}`);
  };

  const handleStop = () => { stopRef.current = true; };
  const sent = friends.filter((f) => f.status === "sent").length;
  const failed = friends.filter((f) => f.status === "failed").length;

  return (
    <div className="pt-16 min-h-screen">
      <div className="hero-bg py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <Link href="/tools" className="inline-flex items-center gap-2 text-gray-400 hover:text-purple-400 text-sm mb-6 transition-colors">
            <ArrowLeft size={16} /> Back to Tools
          </Link>
          <div className="flex items-center gap-4 mb-3">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: "rgba(179,26,255,0.15)" }}>
              <MessageSquare size={26} className="text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white">Mass DM Sender</h1>
              <p className="text-gray-400 text-sm">Send DMs to all your Discord friends at once</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
        <div className="rounded-2xl p-5 flex items-start gap-3" style={{ background: "rgba(255,160,0,0.08)", border: "1px solid rgba(255,160,0,0.25)" }}>
          <AlertTriangle size={18} className="text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-200/80 leading-relaxed">
            <strong className="text-yellow-300">Warning:</strong> Using a user token violates Discord's ToS. Use at your own risk. Your token is never stored — this runs entirely in your browser.
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card-dark rounded-2xl p-6 space-y-5">
            <h2 className="text-white font-bold text-lg">Configuration</h2>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                <User size={14} className="text-purple-400" /> Discord User Token
              </label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste your Discord token here..."
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-500 outline-none"
                style={{ background: "rgba(179,26,255,0.08)", border: "1px solid rgba(179,26,255,0.25)" }}
                disabled={running}
              />
              <p className="text-xs text-gray-500 mt-1.5">F12 → Network → any request → Authorization header</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                <MessageSquare size={14} className="text-purple-400" /> Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder="Type your message here..."
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-500 outline-none resize-none"
                style={{ background: "rgba(179,26,255,0.08)", border: "1px solid rgba(179,26,255,0.25)" }}
                disabled={running}
              />
              <p className="text-xs text-gray-500 mt-1.5">{message.length}/2000 characters</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                <Clock size={14} className="text-purple-400" /> Delay between messages
              </label>
              <div className="flex items-center gap-3">
                <input type="range" min={500} max={10000} step={500} value={delay}
                  onChange={(e) => setDelay(Number(e.target.value))}
                  className="flex-1 accent-purple-500" disabled={running} />
                <span className="text-sm font-bold text-purple-400 w-16 text-right">{delay / 1000}s</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Higher delay = lower rate limit risk</p>
            </div>
            <div className="flex gap-3">
              <button onClick={handleFetch}
                disabled={!token.trim() || running || phase === "fetching"}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{ background: "rgba(179,26,255,0.2)", border: "1px solid rgba(179,26,255,0.4)" }}>
                {phase === "fetching" ? <Loader2 size={16} className="animate-spin" /> : <User size={16} />}
                {phase === "fetching" ? "Fetching..." : "Fetch Friends"}
              </button>
              {!running ? (
                <button onClick={handleSend}
                  disabled={!token.trim() || !message.trim() || friends.length === 0 || message.length > 2000}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white gradient-purple transition-all duration-200 hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100">
                  <Send size={16} /> Send DMs
                </button>
              ) : (
                <button onClick={handleStop}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all duration-200"
                  style={{ background: "rgba(220,38,38,0.3)", border: "1px solid rgba(220,38,38,0.5)" }}>
                  <StopCircle size={16} /> Stop
                </button>
              )}
            </div>
          </div>

          <div className="card-dark rounded-2xl p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold text-lg">Friends List</h2>
              {friends.length > 0 && (
                <div className="flex gap-3 text-xs">
                  <span className="text-green-400 font-semibold">{sent} sent</span>
                  <span className="text-red-400 font-semibold">{failed} failed</span>
                  <span className="text-gray-400">{friends.length} total</span>
                </div>
              )}
            </div>
            {friends.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
                <User size={40} className="text-gray-600 mb-3" />
                <p className="text-gray-500 text-sm">Enter your token and click<br />"Fetch Friends" to load list.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2 max-h-72 pr-1">
                {friends.map((f) => (
                  <div key={f.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                    style={{ background: "rgba(179,26,255,0.06)", border: "1px solid rgba(179,26,255,0.1)" }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white gradient-purple">
                        {f.username[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-white text-xs font-semibold">{f.username}</div>
                        {f.error && <div className="text-red-400 text-xs">{f.error}</div>}
                      </div>
                    </div>
                    <div>
                      {f.status === "pending" && <div className="w-2 h-2 rounded-full bg-gray-500" />}
                      {f.status === "sending" && <Loader2 size={14} className="text-purple-400 animate-spin" />}
                      {f.status === "sent" && <CheckCircle2 size={14} className="text-green-400" />}
                      {f.status === "failed" && <XCircle size={14} className="text-red-400" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card-dark rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              <Play size={16} className="text-purple-400" /> Live Logs
            </h2>
            {logs.length > 0 && (
              <button onClick={() => setLogs([])} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Clear</button>
            )}
          </div>
          {logs.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-6">Logs will appear here...</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto font-mono">
              {logs.map((log, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="text-gray-600 shrink-0">{log.time}</span>
                  <span className={log.type === "success" ? "text-green-400" : log.type === "error" ? "text-red-400" : "text-gray-300"}>
                    {log.msg}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MassDM() {
  return (
    <KeyGate toolId="mass-dm" toolName="Mass DM Sender">
      <MassDMTool />
    </KeyGate>
  );
}
