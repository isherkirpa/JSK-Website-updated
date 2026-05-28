import { useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, Server, Hash, Users, Clock, Play,
  Loader2, CheckCircle, XCircle, AlertTriangle, Info, LogOut,
} from "lucide-react";
import KeyGate from "@/components/KeyGate";
import { serverJoin, serverLeave } from "@/lib/keyManager";

type JoinResult = { token: string; success: boolean; guild?: string; error?: string };
type LeaveResult = { token: string; success: boolean; error?: string };
type Summary = { total: number; success: number; failed: number };

function ServerJoinerTool({ toolKey }: { toolKey: string }) {
  const [mode, setMode]           = useState<"join" | "leave">("join");
  const [inviteInput, setInviteInput] = useState("");
  const [guildIdInput, setGuildIdInput] = useState("");
  const [tokensInput, setTokensInput] = useState("");
  const [delayMs, setDelayMs]     = useState(1500);
  const [running, setRunning]     = useState(false);
  const [joinResults, setJoinResults] = useState<JoinResult[]>([]);
  const [leaveResults, setLeaveResults] = useState<LeaveResult[]>([]);
  const [summary, setSummary]     = useState<Summary | null>(null);
  const [error, setError]         = useState("");

  const tokens = tokensInput.split("\n").map((t) => t.trim()).filter(Boolean);
  const tokenCount = tokens.length;

  const handleAction = async () => {
    if (!tokens.length) return;
    if (mode === "join" && !inviteInput.trim()) return;
    if (mode === "leave" && !guildIdInput.trim()) return;

    setRunning(true);
    setError("");
    setJoinResults([]);
    setLeaveResults([]);
    setSummary(null);

    if (mode === "join") {
      const res = await serverJoin(toolKey, tokens, inviteInput.trim(), delayMs);
      if (!res.ok) {
        setError(res.error ?? "Bot server error. Make sure the server is running.");
        setRunning(false);
        return;
      }
      setJoinResults((res.results as JoinResult[]) ?? []);
      setSummary((res.summary as Summary) ?? { total: tokens.length, success: 0, failed: tokens.length });
    } else {
      const res = await serverLeave(toolKey, tokens, guildIdInput.trim(), delayMs);
      if (!res.ok) {
        setError(res.error ?? "Bot server error. Make sure the server is running.");
        setRunning(false);
        return;
      }
      setLeaveResults((res.results as LeaveResult[]) ?? []);
      setSummary((res.summary as Summary) ?? { total: tokens.length, success: 0, failed: tokens.length });
    }

    setRunning(false);
  };

  const results = mode === "join" ? joinResults : leaveResults;

  return (
    <div className="pt-16 min-h-screen">
      <div className="hero-bg py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <Link href="/tools" className="inline-flex items-center gap-2 text-gray-400 hover:text-purple-400 text-sm mb-6 transition-colors">
            <ArrowLeft size={16} /> Back to Tools
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: "rgba(179,26,255,0.15)" }}>
              <Server size={26} className="text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white">Server Joiner</h1>
              <p className="text-gray-400 text-sm">Join or leave Discord servers with multiple tokens via bot server</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* Mode toggle */}
        <div className="flex gap-2 mb-6 p-1 rounded-xl w-fit" style={{ background: "rgba(179,26,255,0.06)", border: "1px solid rgba(179,26,255,0.12)" }}>
          <button
            onClick={() => { setMode("join"); setError(""); setSummary(null); setJoinResults([]); setLeaveResults([]); }}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${mode === "join" ? "gradient-purple text-white" : "text-gray-400 hover:text-white"}`}
          >
            <Play size={13} /> Join Server
          </button>
          <button
            onClick={() => { setMode("leave"); setError(""); setSummary(null); setJoinResults([]); setLeaveResults([]); }}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${mode === "leave" ? "gradient-purple text-white" : "text-gray-400 hover:text-white"}`}
          >
            <LogOut size={13} /> Leave Server
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Config */}
          <div className="space-y-5">
            {/* Invite / Guild ID */}
            <div className="card-dark rounded-2xl p-5">
              {mode === "join" ? (
                <>
                  <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                    <Hash size={16} className="text-purple-400" /> Server Invite
                  </h3>
                  <input
                    value={inviteInput} onChange={(e) => setInviteInput(e.target.value)}
                    placeholder="https://discord.gg/abc123  or  abc123"
                    className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
                    style={{ background: "rgba(179,26,255,0.07)", border: "1px solid rgba(179,26,255,0.2)" }}
                    disabled={running}
                  />
                  <p className="text-xs text-gray-600 mt-1.5">Paste the full link or just the invite code</p>
                </>
              ) : (
                <>
                  <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                    <Hash size={16} className="text-purple-400" /> Server / Guild ID
                  </h3>
                  <input
                    value={guildIdInput} onChange={(e) => setGuildIdInput(e.target.value.trim())}
                    placeholder="123456789012345678"
                    className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 outline-none font-mono"
                    style={{ background: "rgba(179,26,255,0.07)", border: "1px solid rgba(179,26,255,0.2)" }}
                    disabled={running}
                  />
                  <p className="text-xs text-gray-600 mt-1.5">Right-click server icon → Copy Server ID (enable dev mode)</p>
                </>
              )}
            </div>

            {/* Tokens */}
            <div className="card-dark rounded-2xl p-5">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <Users size={16} className="text-purple-400" /> Tokens
                <span className="text-xs text-gray-500 font-normal">(one per line)</span>
              </h3>
              <textarea
                value={tokensInput} onChange={(e) => setTokensInput(e.target.value)} rows={8}
                placeholder={"Token1\nToken2\nToken3"}
                className="w-full px-4 py-3 rounded-xl text-xs text-white placeholder-gray-600 outline-none resize-none font-mono"
                style={{ background: "rgba(179,26,255,0.07)", border: "1px solid rgba(179,26,255,0.2)" }}
                disabled={running}
              />
              <p className="text-xs text-gray-600 mt-1">{tokenCount} token{tokenCount !== 1 ? "s" : ""}</p>
            </div>

            {/* Delay */}
            <div className="card-dark rounded-2xl p-5">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <Clock size={16} className="text-purple-400" /> {mode === "join" ? "Join" : "Leave"} Delay
              </h3>
              <div className="flex items-center gap-3">
                <input type="range" min={500} max={10000} step={500} value={delayMs}
                  onChange={(e) => setDelayMs(Number(e.target.value))}
                  className="flex-1 accent-purple-500" disabled={running} />
                <span className="text-sm font-bold text-purple-400 w-20 text-right shrink-0">
                  {(delayMs / 1000).toFixed(1)}s delay
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">Delay between each {mode} to avoid rate limits</p>
            </div>

            {mode === "join" && (
              <div className="card-dark rounded-2xl p-4" style={{ border: "1px solid rgba(59,130,246,0.3)", background: "rgba(59,130,246,0.04)" }}>
                <div className="flex items-start gap-2">
                  <Info size={15} className="text-blue-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-blue-300 text-xs font-semibold">About CAPTCHA</p>
                    <p className="text-gray-400 text-xs mt-0.5">
                      Discord may show hCaptcha for some invites. For auto-solving, add your{" "}
                      <span className="text-purple-300 font-semibold">CAPMONSTER_API_KEY</span> in the bot server's .env file.
                      Get it at <a href="https://capmonster.cloud" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">capmonster.cloud</a>.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
                <AlertTriangle size={15} className="text-red-400 mt-0.5 shrink-0" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleAction}
              disabled={running || !tokenCount || (mode === "join" ? !inviteInput.trim() : !guildIdInput.trim())}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white gradient-purple glow-btn transition-all hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {running
                ? <><Loader2 size={16} className="animate-spin" /> {mode === "join" ? "Joining Servers..." : "Leaving Servers..."}</>
                : mode === "join"
                  ? <><Play size={16} /> Start Joining</>
                  : <><LogOut size={16} /> Start Leaving</>
              }
            </button>
          </div>

          {/* Results */}
          <div className="card-dark rounded-2xl p-5 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Server size={16} className="text-purple-400" /> {mode === "join" ? "Join" : "Leave"} Results
              </h3>
              {summary && (
                <div className="flex gap-3 text-xs">
                  <span className="text-green-400 font-bold">{summary.success} {mode === "join" ? "joined" : "left"}</span>
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
                  <div className="h-full rounded-full transition-all" style={{ width: `${(summary.success / summary.total) * 100}%`, background: "linear-gradient(90deg, #7c2dd4, #a855f7)" }} />
                </div>
              </div>
            )}

            {results.length === 0 && !running ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                <Server size={40} className="text-gray-700 mb-3" />
                <p className="text-gray-600 text-sm">Configure the settings,<br />then click {mode === "join" ? '"Start Joining"' : '"Start Leaving"'}.</p>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto flex-1 max-h-[520px] pr-1">
                {running && results.length === 0 && (
                  <div className="flex items-center justify-center py-8 gap-3">
                    <Loader2 size={20} className="text-purple-400 animate-spin" />
                    <span className="text-gray-400 text-sm">{mode === "join" ? "Joining servers..." : "Leaving servers..."}</span>
                  </div>
                )}
                {results.map((r, i) => (
                  <div key={i} className="rounded-xl p-3"
                    style={{
                      background: r.success ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)",
                      border: `1px solid ${r.success ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
                    }}>
                    <div className="flex items-start gap-2">
                      {r.success
                        ? <CheckCircle size={15} className="text-green-400 mt-0.5 shrink-0" />
                        : <XCircle    size={15} className="text-red-400 mt-0.5 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono text-gray-400 truncate">{r.token}</p>
                        {r.success && mode === "join" && (r as JoinResult).guild && (
                          <p className="text-green-300 text-xs font-semibold mt-0.5">
                            Joined: {(r as JoinResult).guild}
                          </p>
                        )}
                        {r.success && mode === "leave" && (
                          <p className="text-green-300 text-xs font-semibold mt-0.5">Left successfully</p>
                        )}
                        {!r.success && r.error && (
                          <p className="text-red-300 text-xs mt-0.5">{r.error}</p>
                        )}
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

export default function ServerJoiner() {
  return (
    <KeyGate toolId="server-joiner" toolName="Server Joiner">
      {(key) => <ServerJoinerTool toolKey={key} />}
    </KeyGate>
  );
}
