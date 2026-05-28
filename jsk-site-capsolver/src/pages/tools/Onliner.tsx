import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, Wifi, WifiOff, Play, StopCircle, User, Zap, Clock,
  Monitor, Smile, RotateCcw, Server, Globe, CheckCircle, XCircle,
  Loader2, RefreshCw,
} from "lucide-react";
import KeyGate from "@/components/KeyGate";
import { botStartToken, botStopToken, getMyTokens, type LiveTokenInfo } from "@/lib/keyManager";

type PresenceStatus = "online" | "idle" | "dnd" | "invisible";
const STATUS_COLORS: Record<PresenceStatus, string> = {
  online: "#23d160", idle: "#f5a623", dnd: "#ed4245", invisible: "#747f8d",
};
const STATUS_LABELS: Record<PresenceStatus, string> = {
  online: "Online", idle: "Idle", dnd: "Do Not Disturb", invisible: "Invisible",
};

type Activity = { type: 0 | 1 | 2 | 3; name: string; url?: string };
type TokenState = {
  token: string;
  status: "idle" | "connecting" | "connected" | "error" | "stopped";
  username?: string;
  avatar?: string;
  id?: string;
  currentStatus?: PresenceStatus;
  currentStatusText?: string;
  error?: string;
  tid?: string;
};

// ─── Browser WebSocket Worker ──────────────────────────────────────────────────

const EMOJI_RE = /^<:([a-zA-Z0-9_]+):([0-9]+)>\s*/;
function parseStatusLine(line: string) {
  const m = EMOJI_RE.exec(line);
  if (m) return { text: line.replace(m[0], "").trim(), emoji: { name: m[1], id: m[2], animated: false } };
  return { text: line.trim(), emoji: undefined };
}

function buildActivities(
  enableCustomStatus: boolean, statusText: string,
  enableActivity: boolean, activity: Activity,
  enableStream: boolean, streamUrl: string
): object[] {
  const acts: object[] = [];
  if (enableCustomStatus && statusText.trim()) {
    const parsed = parseStatusLine(statusText);
    const a: Record<string, unknown> = { type: 4, name: "Custom Status", state: parsed.text };
    if (parsed.emoji) a.emoji = parsed.emoji;
    acts.push(a);
  }
  if (enableActivity && activity.name.trim()) {
    const a: Record<string, unknown> = { type: enableStream ? 1 : activity.type, name: activity.name };
    if (enableStream && streamUrl.trim()) a.url = streamUrl;
    acts.push(a);
  }
  return acts;
}

class DiscordWorker {
  private ws: WebSocket | null = null;
  private hbTimer: ReturnType<typeof setTimeout> | null = null;
  private rotateTimer: ReturnType<typeof setInterval> | null = null;
  private seq: number | null = null;
  private rotateIndex = 0;
  public stopped = false;

  constructor(
    private token: string,
    private presenceStatus: PresenceStatus,
    private enableCustomStatus: boolean,
    private rotateStatuses: boolean,
    private statusList: string[],
    private rotateInterval: number,
    private enableActivity: boolean,
    private activity: Activity,
    private enableStream: boolean,
    private streamUrl: string,
    private onStateChange: (s: Partial<TokenState>) => void,
    private onReady: (u: { username: string; avatar: string | null; id: string }) => void
  ) {}

  connect() {
    if (this.stopped) return;
    this.onStateChange({ status: "connecting" });
    try { this.ws = new WebSocket("wss://gateway.discord.gg/?v=10&encoding=json"); }
    catch { this.onStateChange({ status: "error", error: "WebSocket blocked" }); return; }

    this.ws.onmessage = (e) => {
      let data: { op: number; d: Record<string, unknown>; t?: string; s?: number };
      try { data = JSON.parse(e.data as string); } catch { return; }
      if (data.s) this.seq = data.s;
      if (data.op === 10) { this.startHeartbeat(data.d.heartbeat_interval as number); this.identify(); }
      else if (data.op === 0 && data.t === "READY") {
        const user = data.d.user as Record<string, string>;
        this.onReady({ username: user.username, avatar: user.avatar ?? null, id: user.id });
        this.onStateChange({ status: "connected", username: user.username, id: user.id, avatar: user.avatar ?? null, currentStatus: this.presenceStatus });
        this.sendPresence();
        if (this.rotateStatuses && this.statusList.length > 1) this.startRotation();
      } else if (data.op === 9) { this.onStateChange({ status: "error", error: "Invalid session" }); }
    };
    this.ws.onerror = () => { if (!this.stopped) this.onStateChange({ status: "error", error: "Connection error" }); };
    this.ws.onclose = () => {
      this.clearTimers();
      if (!this.stopped) { this.onStateChange({ status: "connecting", error: undefined }); setTimeout(() => this.connect(), 5000); }
    };
  }

  private identify() {
    const acts = buildActivities(this.enableCustomStatus, this.statusList[0] ?? "", this.enableActivity, this.activity, this.enableStream, this.streamUrl);
    this.send({ op: 2, d: { token: this.token, intents: 0, properties: { os: "linux", browser: "chrome", device: "pc" }, presence: { status: this.presenceStatus, since: 0, afk: false, activities: acts } } });
  }

  private sendPresence() {
    const text = this.statusList[this.rotateIndex] ?? "";
    this.onStateChange({ currentStatusText: text || undefined });
    const acts = buildActivities(this.enableCustomStatus, text, this.enableActivity, this.activity, this.enableStream, this.streamUrl);
    this.send({ op: 3, d: { since: 0, activities: acts, status: this.presenceStatus, afk: false } });
  }

  private startHeartbeat(interval: number) {
    if (this.hbTimer) clearTimeout(this.hbTimer);
    const beat = () => { this.send({ op: 1, d: this.seq }); this.hbTimer = setTimeout(beat, interval); };
    this.hbTimer = setTimeout(beat, interval * Math.random());
  }

  private startRotation() {
    if (this.rotateTimer) clearInterval(this.rotateTimer);
    this.rotateTimer = setInterval(() => { this.rotateIndex = (this.rotateIndex + 1) % this.statusList.length; this.sendPresence(); }, this.rotateInterval * 1000);
  }

  private send(data: unknown) { if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(data)); }
  private clearTimers() {
    if (this.hbTimer) { clearTimeout(this.hbTimer); this.hbTimer = null; }
    if (this.rotateTimer) { clearInterval(this.rotateTimer); this.rotateTimer = null; }
  }
  stop() { this.stopped = true; this.clearTimers(); this.ws?.close(); this.ws = null; }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function avatarUrl(id: string, avatar: string | null) {
  if (!avatar) return `https://cdn.discordapp.com/embed/avatars/${(BigInt(id) >> 22n) % 6n}.png`;
  return `https://cdn.discordapp.com/avatars/${id}/${avatar}.${avatar.startsWith("a_") ? "gif" : "png"}?size=64`;
}

function Toggle({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button onClick={() => !disabled && onChange(!value)}
      className={`relative w-10 h-5 rounded-full transition-all duration-200 ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      style={{ background: value ? "#7c2dd4" : "rgba(255,255,255,0.1)" }}>
      <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200" style={{ left: value ? "calc(100% - 1.1rem)" : "0.1rem" }} />
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; color: string }> = {
    idle:       { label: "Idle",         color: "rgba(100,100,120,0.5)" },
    connecting: { label: "Connecting...", color: "rgba(179,26,255,0.3)" },
    connected:  { label: "Connected",    color: "rgba(34,197,94,0.3)" },
    error:      { label: "Error",        color: "rgba(239,68,68,0.3)" },
    stopped:    { label: "Stopped",      color: "rgba(100,100,120,0.3)" },
    running:    { label: "24/7 Live",    color: "rgba(34,197,94,0.3)" },
    sending:    { label: "Starting...",  color: "rgba(179,26,255,0.3)" },
  };
  const c = cfg[status] ?? cfg.idle;
  return <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: c.color, color: "#fff" }}>{c.label}</span>;
}

// ─── CONFIG PANEL ─────────────────────────────────────────────────────────────

function ConfigPanel({
  running, tokensInput, setTokensInput, presenceStatus, setPresenceStatus,
  enableCustomStatus, setEnableCustomStatus, rotateStatuses, setRotateStatuses,
  statusList, setStatusList, rotateInterval, setRotateInterval,
  enableActivity, setEnableActivity, activityType, setActivityType,
  activityName, setActivityName, enableStream, setEnableStream, streamUrl, setStreamUrl,
}: {
  running: boolean;
  tokensInput: string; setTokensInput: (v: string) => void;
  presenceStatus: PresenceStatus; setPresenceStatus: (v: PresenceStatus) => void;
  enableCustomStatus: boolean; setEnableCustomStatus: (v: boolean) => void;
  rotateStatuses: boolean; setRotateStatuses: (v: boolean) => void;
  statusList: string; setStatusList: (v: string) => void;
  rotateInterval: number; setRotateInterval: (v: number) => void;
  enableActivity: boolean; setEnableActivity: (v: boolean) => void;
  activityType: 0 | 1 | 2 | 3; setActivityType: (v: 0 | 1 | 2 | 3) => void;
  activityName: string; setActivityName: (v: string) => void;
  enableStream: boolean; setEnableStream: (v: boolean) => void;
  streamUrl: string; setStreamUrl: (v: string) => void;
}) {
  const tokenCount = tokensInput.split("\n").filter((t) => t.trim()).length;
  return (
    <div className="space-y-5">
      <div className="card-dark rounded-2xl p-5">
        <h3 className="text-white font-bold mb-3 flex items-center gap-2">
          <User size={16} className="text-purple-400" /> Tokens <span className="text-xs text-gray-500 font-normal">(one per line)</span>
        </h3>
        <textarea value={tokensInput} onChange={(e) => setTokensInput(e.target.value)} rows={6}
          placeholder={"Token1\nToken2\nToken3"}
          className="w-full px-4 py-3 rounded-xl text-xs text-white placeholder-gray-600 outline-none resize-none font-mono"
          style={{ background: "rgba(179,26,255,0.07)", border: "1px solid rgba(179,26,255,0.2)" }} disabled={running} />
        <p className="text-xs text-gray-600 mt-1">{tokenCount} token{tokenCount !== 1 ? "s" : ""}</p>
      </div>

      <div className="card-dark rounded-2xl p-5">
        <h3 className="text-white font-bold mb-3 flex items-center gap-2"><Zap size={16} className="text-purple-400" /> Presence Status</h3>
        <div className="grid grid-cols-2 gap-2">
          {(["online", "idle", "dnd", "invisible"] as PresenceStatus[]).map((s) => (
            <button key={s} onClick={() => !running && setPresenceStatus(s)} disabled={running}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${presenceStatus === s ? "text-white" : "text-gray-400 hover:text-white"}`}
              style={{ background: presenceStatus === s ? STATUS_COLORS[s] + "22" : "rgba(179,26,255,0.06)", border: `1px solid ${presenceStatus === s ? STATUS_COLORS[s] + "66" : "rgba(179,26,255,0.12)"}` }}>
              <span className="w-3 h-3 rounded-full" style={{ background: STATUS_COLORS[s] }} />{STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="card-dark rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-bold flex items-center gap-2"><Smile size={16} className="text-purple-400" /> Custom Status</h3>
          <Toggle value={enableCustomStatus} onChange={setEnableCustomStatus} disabled={running} />
        </div>
        {enableCustomStatus && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <RotateCcw size={14} className="text-gray-400" />
              <span className="text-sm text-gray-300">Status Rotator</span>
              <Toggle value={rotateStatuses} onChange={setRotateStatuses} disabled={running} />
            </div>
            <textarea value={statusList} onChange={(e) => setStatusList(e.target.value)} rows={rotateStatuses ? 5 : 2}
              placeholder={rotateStatuses ? "<:emoji:123456> First status\nSecond status" : "Your status text..."}
              className="w-full px-4 py-3 rounded-xl text-xs text-white placeholder-gray-600 outline-none resize-none font-mono"
              style={{ background: "rgba(179,26,255,0.07)", border: "1px solid rgba(179,26,255,0.2)" }} disabled={running} />
            {rotateStatuses && (
              <div className="flex items-center gap-3">
                <Clock size={14} className="text-gray-400 shrink-0" />
                <input type="range" min={5} max={120} step={5} value={rotateInterval} onChange={(e) => setRotateInterval(Number(e.target.value))} className="flex-1 accent-purple-500" disabled={running} />
                <span className="text-sm font-bold text-purple-400 w-20 text-right">every {rotateInterval}s</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card-dark rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-bold flex items-center gap-2"><Monitor size={16} className="text-purple-400" /> Activity</h3>
          <Toggle value={enableActivity} onChange={setEnableActivity} disabled={running} />
        </div>
        {enableActivity && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {([{ t: 0, l: "Playing" }, { t: 3, l: "Watching" }, { t: 2, l: "Listening" }, { t: 1, l: "Streaming" }] as { t: 0 | 1 | 2 | 3; l: string }[]).map(({ t, l }) => (
                <button key={t} onClick={() => { setActivityType(t); setEnableStream(t === 1); }} disabled={running}
                  className={`py-2 rounded-xl text-xs font-semibold transition-all ${activityType === t ? "gradient-purple text-white" : "text-gray-400"}`}
                  style={activityType !== t ? { background: "rgba(179,26,255,0.08)", border: "1px solid rgba(179,26,255,0.15)" } : {}}>{l}</button>
              ))}
            </div>
            <input value={activityName} onChange={(e) => setActivityName(e.target.value)}
              placeholder={activityType === 0 ? "Minecraft" : activityType === 3 ? "YouTube" : activityType === 2 ? "Spotify" : "Stream name"}
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
              style={{ background: "rgba(179,26,255,0.07)", border: "1px solid rgba(179,26,255,0.2)" }} disabled={running} />
            {(enableStream || activityType === 1) && (
              <input value={streamUrl} onChange={(e) => setStreamUrl(e.target.value)} placeholder="https://twitch.tv/yourname"
                className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
                style={{ background: "rgba(179,26,255,0.07)", border: "1px solid rgba(179,26,255,0.2)" }} disabled={running} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── BOT SERVER MODE (24/7) ────────────────────────────────────────────────────

function BotServerMode({ toolKey }: { toolKey: string }) {
  const [tokensInput,        setTokensInput]        = useState("");
  const [presenceStatus,     setPresenceStatus]     = useState<PresenceStatus>("online");
  const [enableCustomStatus, setEnableCustomStatus] = useState(false);
  const [rotateStatuses,     setRotateStatuses]     = useState(false);
  const [statusList,         setStatusList]         = useState("");
  const [rotateInterval,     setRotateInterval]     = useState(10);
  const [enableActivity,     setEnableActivity]     = useState(false);
  const [activityType,       setActivityType]       = useState<0 | 1 | 2 | 3>(0);
  const [activityName,       setActivityName]       = useState("");
  const [enableStream,       setEnableStream]       = useState(false);
  const [streamUrl,          setStreamUrl]          = useState("");

  const [tokenStates,  setTokenStates]  = useState<{ token: string; status: string; tid?: string; error?: string; username?: string; avatar?: string; userId?: string; presence?: string; statusText?: string }[]>([]);
  const [running,      setRunning]      = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [liveLoading,  setLiveLoading]  = useState(false);
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // On mount: fetch already-running tokens for this key
  const fetchMyTokens = useCallback(async (showLoader = false) => {
    if (showLoader) setLiveLoading(true);
    const res = await getMyTokens(toolKey);
    if (res.ok && res.tokens && res.tokens.length > 0) {
      const mapped = res.tokens.map((t: LiveTokenInfo) => ({
        token:     t.tokenPreview ?? "",
        status:    t.status === "connected" ? "running" : t.status ?? "running",
        tid:       undefined,
        error:     t.error,
        username:  t.username,
        avatar:    t.avatar,
        userId:    t.userId,
        presence:  t.presence,
        statusText: t.currentStatusText,
      }));
      setTokenStates(mapped);
      setRunning(true);
    }
    if (showLoader) setLiveLoading(false);
  }, [toolKey]);

  useEffect(() => {
    void fetchMyTokens(true);
    // Auto-refresh every 30s
    refreshRef.current = setInterval(() => { void fetchMyTokens(); }, 30000);
    return () => { if (refreshRef.current) clearInterval(refreshRef.current); };
  }, [fetchMyTokens]);

  const handleStart = async () => {
    const tokens = tokensInput.split("\n").map((t) => t.trim()).filter(Boolean);
    if (!tokens.length) return;
    setLoading(true);
    setTokenStates(tokens.map((t) => ({ token: t, status: "sending" })));
    const settings = {
      presenceStatus, enableCustomStatus, rotateStatuses,
      statusList, rotateInterval, enableActivity,
      activityType, activityName, enableStream, streamUrl,
    };
    const results: typeof tokenStates = [];
    for (const token of tokens) {
      const res = await botStartToken(toolKey, token, settings);
      results.push({
        token,
        status: res.ok ? "running" : "error",
        tid: res.tid,
        error: res.error,
      });
    }
    setTokenStates(results);
    setRunning(true);
    setLoading(false);
    // Refresh after 3s to get live data
    setTimeout(() => void fetchMyTokens(), 3000);
  };

  const handleStop = async () => {
    setLoading(true);
    for (const ts of tokenStates) {
      if (ts.token && !ts.token.endsWith("...")) {
        await botStopToken(toolKey, ts.token, ts.tid);
      }
    }
    setTokenStates((prev) => prev.map((t) => ({ ...t, status: "stopped" })));
    setRunning(false);
    setLoading(false);
  };

  const tokenCount = tokensInput.split("\n").filter((t) => t.trim()).length;
  const STATUS_COLORS: Record<string, string> = { online: "#23d160", idle: "#f5a623", dnd: "#ed4245", invisible: "#747f8d" };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ConfigPanel
        running={running || loading}
        tokensInput={tokensInput} setTokensInput={setTokensInput}
        presenceStatus={presenceStatus} setPresenceStatus={setPresenceStatus}
        enableCustomStatus={enableCustomStatus} setEnableCustomStatus={setEnableCustomStatus}
        rotateStatuses={rotateStatuses} setRotateStatuses={setRotateStatuses}
        statusList={statusList} setStatusList={setStatusList}
        rotateInterval={rotateInterval} setRotateInterval={setRotateInterval}
        enableActivity={enableActivity} setEnableActivity={setEnableActivity}
        activityType={activityType} setActivityType={setActivityType}
        activityName={activityName} setActivityName={setActivityName}
        enableStream={enableStream} setEnableStream={setEnableStream}
        streamUrl={streamUrl} setStreamUrl={setStreamUrl}
      />

      <div className="space-y-5">
        <div className="card-dark rounded-2xl p-4" style={{ border: "1px solid rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.04)" }}>
          <div className="flex items-start gap-3">
            <Server size={18} className="text-green-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-green-300 font-bold text-sm">Bot Server Mode — 24/7 Online</p>
              <p className="text-gray-400 text-xs mt-1">Tokens run on the bot server. They stay online even when you close your browser.</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          {!running ? (
            <button onClick={handleStart} disabled={!tokenCount || loading}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white gradient-purple glow-btn transition-all hover:scale-105 disabled:opacity-40">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Server size={16} />}
              {loading ? "Sending to Server..." : "Start on Bot Server"}
            </button>
          ) : (
            <button onClick={handleStop} disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white transition-all"
              style={{ background: "rgba(220,38,38,0.3)", border: "1px solid rgba(220,38,38,0.5)" }}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <StopCircle size={16} />}
              {loading ? "Stopping..." : "Stop All from Server"}
            </button>
          )}
          <button onClick={() => fetchMyTokens(true)} disabled={liveLoading}
            className="p-3 rounded-xl text-gray-400 hover:text-white transition-colors"
            style={{ background: "rgba(179,26,255,0.08)", border: "1px solid rgba(179,26,255,0.15)" }}
            title="Refresh live status">
            <RefreshCw size={16} className={liveLoading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="card-dark rounded-2xl p-5">
          <h3 className="text-white font-bold mb-3 flex items-center gap-2">
            <Server size={16} className="text-purple-400" /> Live Server Status
            {tokenStates.length > 0 && <span className="text-xs text-gray-500 font-normal ml-auto">{tokenStates.filter(t => t.status === "running").length} running</span>}
          </h3>
          {liveLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="text-purple-400 animate-spin" />
            </div>
          ) : tokenStates.length === 0 ? (
            <div className="text-center py-8">
              <Server size={36} className="text-gray-700 mx-auto mb-2" />
              <p className="text-gray-600 text-sm">No accounts running on this key.</p>
              <p className="text-gray-700 text-xs mt-1">Add tokens above and click "Start on Bot Server"</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {tokenStates.map((ts, i) => (
                <div key={i} className="rounded-xl p-3 flex items-center gap-3"
                  style={{
                    background: ts.status === "running" ? "rgba(34,197,94,0.06)" : ts.status === "error" ? "rgba(239,68,68,0.06)" : "rgba(179,26,255,0.05)",
                    border: `1px solid ${ts.status === "running" ? "rgba(34,197,94,0.2)" : ts.status === "error" ? "rgba(239,68,68,0.2)" : "rgba(179,26,255,0.12)"}`,
                  }}>
                  {ts.avatar && ts.userId
                    ? <img src={avatarUrl(ts.userId, ts.avatar)} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                    : <div className="w-8 h-8 rounded-full gradient-purple shrink-0 flex items-center justify-center text-xs text-white font-bold">
                        {ts.username ? ts.username[0].toUpperCase() : "?"}
                      </div>}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {ts.presence && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_COLORS[ts.presence] ?? "#747f8d" }} />}
                      <span className="text-xs font-semibold text-white truncate">{ts.username ?? ts.token.substring(0, 20) + "..."}</span>
                    </div>
                    {ts.statusText && <p className="text-purple-300 text-xs truncate mt-0.5">{ts.statusText}</p>}
                    {ts.error && <p className="text-red-400 text-xs truncate mt-0.5">{ts.error}</p>}
                  </div>
                  <div className="shrink-0">
                    {ts.status === "running"  && <CheckCircle size={14} className="text-green-400" />}
                    {ts.status === "error"    && <XCircle    size={14} className="text-red-400" />}
                    {ts.status === "sending"  && <Loader2    size={14} className="text-purple-400 animate-spin" />}
                    {ts.status === "stopped"  && <WifiOff    size={14} className="text-gray-500" />}
                    {ts.status === "connecting" && <Loader2  size={14} className="text-purple-400 animate-spin" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── BROWSER MODE ──────────────────────────────────────────────────────────────

function BrowserMode() {
  const [tokensInput,        setTokensInput]        = useState("");
  const [presenceStatus,     setPresenceStatus]     = useState<PresenceStatus>("online");
  const [enableCustomStatus, setEnableCustomStatus] = useState(false);
  const [rotateStatuses,     setRotateStatuses]     = useState(false);
  const [statusList,         setStatusList]         = useState("");
  const [rotateInterval,     setRotateInterval]     = useState(10);
  const [enableActivity,     setEnableActivity]     = useState(false);
  const [activityType,       setActivityType]       = useState<0 | 1 | 2 | 3>(0);
  const [activityName,       setActivityName]       = useState("");
  const [enableStream,       setEnableStream]       = useState(false);
  const [streamUrl,          setStreamUrl]          = useState("");
  const [tokenStates,        setTokenStates]        = useState<TokenState[]>([]);
  const [running,            setRunning]            = useState(false);
  const workersRef = useRef<Map<string, DiscordWorker>>(new Map());

  const updateState = useCallback((token: string, update: Partial<TokenState>) => {
    setTokenStates((prev) => prev.map((ts) => (ts.token === token ? { ...ts, ...update } : ts)));
  }, []);

  const handleStart = () => {
    const tokens = tokensInput.split("\n").map((t) => t.trim()).filter(Boolean);
    if (!tokens.length) return;
    const statuses = statusList.split("\n").map((s) => s.trim()).filter(Boolean);
    if (enableCustomStatus && !rotateStatuses && statuses.length === 0) statuses.push("");
    setTokenStates(tokens.map((t) => ({ token: t, status: "idle" as const })));
    setRunning(true);
    workersRef.current.clear();
    const activity: Activity = { type: activityType, name: activityName, url: streamUrl };
    tokens.forEach((token) => {
      const worker = new DiscordWorker(
        token, presenceStatus, enableCustomStatus, rotateStatuses,
        statuses.length ? statuses : [""], rotateInterval, enableActivity,
        activity, enableStream, streamUrl,
        (update) => updateState(token, update),
        (user)   => updateState(token, { username: user.username, avatar: user.avatar ?? undefined, id: user.id })
      );
      workersRef.current.set(token, worker);
      worker.connect();
    });
  };

  const handleStop = () => {
    workersRef.current.forEach((w) => w.stop());
    workersRef.current.clear();
    setTokenStates((prev) => prev.map((ts) => ({ ...ts, status: "stopped" as const })));
    setRunning(false);
  };

  const connected = tokenStates.filter((t) => t.status === "connected").length;
  const STATUS_COLORS: Record<PresenceStatus, string> = { online: "#23d160", idle: "#f5a623", dnd: "#ed4245", invisible: "#747f8d" };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ConfigPanel
        running={running}
        tokensInput={tokensInput} setTokensInput={setTokensInput}
        presenceStatus={presenceStatus} setPresenceStatus={setPresenceStatus}
        enableCustomStatus={enableCustomStatus} setEnableCustomStatus={setEnableCustomStatus}
        rotateStatuses={rotateStatuses} setRotateStatuses={setRotateStatuses}
        statusList={statusList} setStatusList={setStatusList}
        rotateInterval={rotateInterval} setRotateInterval={setRotateInterval}
        enableActivity={enableActivity} setEnableActivity={setEnableActivity}
        activityType={activityType} setActivityType={setActivityType}
        activityName={activityName} setActivityName={setActivityName}
        enableStream={enableStream} setEnableStream={setEnableStream}
        streamUrl={streamUrl} setStreamUrl={setStreamUrl}
      />

      <div className="space-y-5">
        <div className="card-dark rounded-2xl p-4" style={{ border: "1px solid rgba(59,130,246,0.3)", background: "rgba(59,130,246,0.04)" }}>
          <div className="flex items-start gap-3">
            <Globe size={18} className="text-blue-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-blue-300 font-bold text-sm">Browser Mode</p>
              <p className="text-gray-400 text-xs mt-1">Tokens run in this browser tab. They stop if you close or refresh the page. Use Bot Server Mode for 24/7.</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          {!running ? (
            <button onClick={handleStart} disabled={!tokensInput.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white gradient-purple glow-btn transition-all hover:scale-105 disabled:opacity-40">
              <Play size={16} /> Start in Browser
            </button>
          ) : (
            <button onClick={handleStop}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white transition-all"
              style={{ background: "rgba(220,38,38,0.3)", border: "1px solid rgba(220,38,38,0.5)" }}>
              <StopCircle size={16} /> Stop All
            </button>
          )}
        </div>

        {tokenStates.length > 0 && (
          <div className="card-dark rounded-2xl p-5">
            <h3 className="text-white font-bold mb-3 flex items-center gap-2 justify-between">
              <span className="flex items-center gap-2"><Wifi size={16} className="text-purple-400" /> Live Status</span>
              <span className="text-xs text-gray-500">{connected}/{tokenStates.length} connected</span>
            </h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {tokenStates.map((ts, i) => (
                <div key={i} className="rounded-xl p-3 flex items-center gap-3"
                  style={{
                    background: ts.status === "connected" ? "rgba(34,197,94,0.06)" : ts.status === "error" ? "rgba(239,68,68,0.06)" : "rgba(179,26,255,0.05)",
                    border: `1px solid ${ts.status === "connected" ? "rgba(34,197,94,0.2)" : ts.status === "error" ? "rgba(239,68,68,0.2)" : "rgba(179,26,255,0.12)"}`,
                  }}>
                  {ts.avatar && ts.id
                    ? <img src={avatarUrl(ts.id, ts.avatar)} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                    : <div className="w-8 h-8 rounded-full gradient-purple shrink-0 flex items-center justify-center text-xs text-white font-bold">
                        {ts.username ? ts.username[0].toUpperCase() : "?"}
                      </div>}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {ts.currentStatus && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_COLORS[ts.currentStatus] }} />}
                      <span className="text-xs font-semibold text-white truncate">{ts.username ?? ts.token.substring(0, 20) + "..."}</span>
                    </div>
                    {ts.currentStatusText && <p className="text-purple-300 text-xs truncate mt-0.5">{ts.currentStatusText}</p>}
                    {ts.error && <p className="text-red-400 text-xs truncate mt-0.5">{ts.error}</p>}
                  </div>
                  <StatusBadge status={ts.status} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────────

function OnlinerTool({ toolKey }: { toolKey: string }) {
  const [mode, setMode] = useState<"bot" | "browser">("bot");

  return (
    <div className="pt-16 min-h-screen">
      <div className="hero-bg py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <Link href="/tools" className="inline-flex items-center gap-2 text-gray-400 hover:text-purple-400 text-sm mb-6 transition-colors">
            <ArrowLeft size={16} /> Back to Tools
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: "rgba(179,26,255,0.15)" }}>
              <Wifi size={26} className="text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white">Discord Onliner</h1>
              <p className="text-gray-400 text-sm">Keep Discord accounts online 24/7 with custom status & activity</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex gap-2 mb-8 p-1 rounded-xl w-fit" style={{ background: "rgba(179,26,255,0.06)", border: "1px solid rgba(179,26,255,0.12)" }}>
          <button onClick={() => setMode("bot")}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${mode === "bot" ? "gradient-purple text-white" : "text-gray-400 hover:text-white"}`}>
            <Server size={14} /> Bot Server (24/7)
          </button>
          <button onClick={() => setMode("browser")}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${mode === "browser" ? "gradient-purple text-white" : "text-gray-400 hover:text-white"}`}>
            <Globe size={14} /> Browser Mode
          </button>
        </div>

        {mode === "bot"     && <BotServerMode toolKey={toolKey} />}
        {mode === "browser" && <BrowserMode />}
      </div>
    </div>
  );
}

export default function Onliner() {
  return (
    <KeyGate toolId="onliner" toolName="Discord Onliner">
      {(key) => <OnlinerTool toolKey={key} />}
    </KeyGate>
  );
}
