import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { Session } from "../../App";
import { cn } from "../../lib/utils";

interface TokenState {
  status: "connecting" | "connected" | "error" | "stopped";
  username: string | null;
  userId: string | null;
  avatar: string | null;
  presence: string;
  currentStatusText: string | null;
  error: string | null;
  startedAt: number;
  tokenPreview: string;
}

interface OnlinerSettings {
  presenceStatus: "online" | "idle" | "dnd" | "invisible";
  statusList: string;
  enableCustomStatus: boolean;
  rotateStatuses: boolean;
  rotateInterval: number;
  enableActivity: boolean;
  activityName: string;
  activityType: number;
}

interface Props {
  session: Session;
}

const PRESENCE_OPTIONS = [
  { value: "online", label: "Online", color: "bg-green-500" },
  { value: "idle", label: "Idle", color: "bg-yellow-500" },
  { value: "dnd", label: "Do Not Disturb", color: "bg-red-500" },
  { value: "invisible", label: "Invisible", color: "bg-gray-500" },
] as const;

export default function OnlinerTool({ session }: Props) {
  const [tokens, setTokens] = useState("");
  const [settings, setSettings] = useState<OnlinerSettings>({
    presenceStatus: "online",
    statusList: "",
    enableCustomStatus: true,
    rotateStatuses: false,
    rotateInterval: 10,
    enableActivity: false,
    activityName: "",
    activityType: 0,
  });
  const [loading, setLoading] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [statuses, setStatuses] = useState<TokenState[]>([]);
  const [polling, setPolling] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const pollingRef = useRef(false);

  useEffect(() => {
    pollingRef.current = polling;
  }, [polling]);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/onliner/status?key=${encodeURIComponent(session.key)}`);
        if (res.ok) {
          const data = (await res.json()) as { statuses: TokenState[]; settings: OnlinerSettings | null };
          setStatuses(data.statuses ?? []);
          if (data.statuses && data.statuses.length > 0) {
            setPolling(true);
          }
        }
      } catch {}
    };
    poll();
  }, [session.key]);

  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/onliner/status?key=${encodeURIComponent(session.key)}`);
        if (res.ok) {
          const data = (await res.json()) as { statuses: TokenState[]; settings: OnlinerSettings | null };
          setStatuses(data.statuses ?? []);
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [polling, session.key]);

  const start = async () => {
    const tokenList = tokens.split(/[\n,]+/).map((t) => t.trim()).filter(Boolean);
    if (tokenList.length === 0) {
      toast.error("Enter at least one token");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/onliner/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: session.key, tokens: tokenList, settings }),
      });
      const data = (await res.json()) as { started: boolean; tokenCount: number; statuses: TokenState[]; error?: string };
      if (!res.ok) { toast.error(data.error ?? "Failed"); return; }
      setStatuses(data.statuses);
      setPolling(true);
      toast.success(`Started ${data.tokenCount} token(s) — saved & will resume on restart`);
    } catch {
      toast.error("Connection error");
    } finally {
      setLoading(false);
    }
  };

  const stop = async () => {
    setStopping(true);
    try {
      await fetch("/api/onliner/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: session.key }),
      });
      setStatuses([]);
      setPolling(false);
      toast.success("All tokens stopped");
    } catch {
      toast.error("Connection error");
    } finally {
      setStopping(false);
    }
  };

  const applySettings = async () => {
    try {
      const res = await fetch("/api/onliner/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: session.key, settings }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok) { toast.error(data.error ?? "Failed"); return; }
      toast.success("Settings updated live");
    } catch {
      toast.error("Connection error");
    }
  };

  const statusDot: Record<string, string> = {
    connected: "bg-green-500",
    connecting: "bg-yellow-400 animate-pulse",
    error: "bg-red-500",
    stopped: "bg-gray-500",
  };

  const onlineCount = statuses.filter((s) => s.status === "connected").length;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-foreground font-heading">Onliner</h2>
        <p className="text-muted-foreground text-sm mt-1">Keep Discord accounts online 24/7 — sessions saved across restarts</p>
      </div>

      <div className="rounded-2xl border border-border card-glow p-5 space-y-4" style={{ background: "hsl(var(--card))" }}>
        <div>
          <label className="block text-sm font-medium mb-2">Tokens <span className="text-muted-foreground">(one per line)</span></label>
          <textarea
            value={tokens}
            onChange={(e) => setTokens(e.target.value)}
            placeholder="Paste tokens here, one per line..."
            rows={5}
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-input text-foreground text-xs font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Presence Status</label>
          <div className="flex gap-2 flex-wrap">
            {PRESENCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSettings((s) => ({ ...s, presenceStatus: opt.value }))}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all",
                  settings.presenceStatus === opt.value
                    ? "border-primary bg-primary/20 text-foreground"
                    : "border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                <span className={cn("w-2.5 h-2.5 rounded-full", opt.color)} />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium">Status Messages</label>
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={settings.rotateStatuses}
                onChange={(e) => setSettings((s) => ({ ...s, rotateStatuses: e.target.checked }))}
                className="rounded"
              />
              Rotate statuses
            </label>
          </div>
          <textarea
            value={settings.statusList}
            onChange={(e) => setSettings((s) => ({ ...s, statusList: e.target.value }))}
            placeholder={settings.rotateStatuses ? "One status per line — will rotate between them" : "Custom status text (optional)"}
            rows={settings.rotateStatuses ? 4 : 2}
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-input text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          {settings.rotateStatuses && (
            <div className="flex items-center gap-2 mt-2">
              <label className="text-xs text-muted-foreground">Rotate every</label>
              <input
                type="number"
                min={5}
                max={3600}
                value={settings.rotateInterval}
                onChange={(e) => setSettings((s) => ({ ...s, rotateInterval: Number(e.target.value) }))}
                className="w-20 px-2 py-1 rounded-lg border border-border bg-input text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <label className="text-xs text-muted-foreground">seconds</label>
            </div>
          )}
        </div>

        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAdvanced ? "▲ Hide" : "▼ Show"} advanced options
        </button>

        {showAdvanced && (
          <div className="space-y-3 pt-1 border-t border-border">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enableActivity}
                onChange={(e) => setSettings((s) => ({ ...s, enableActivity: e.target.checked }))}
                className="rounded"
              />
              Enable Activity
            </label>
            {settings.enableActivity && (
              <div className="flex gap-3">
                <input
                  type="text"
                  value={settings.activityName}
                  onChange={(e) => setSettings((s) => ({ ...s, activityName: e.target.value }))}
                  placeholder="Activity name..."
                  className="flex-1 px-3 py-2 rounded-xl border border-border bg-input text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <select
                  value={settings.activityType}
                  onChange={(e) => setSettings((s) => ({ ...s, activityType: Number(e.target.value) }))}
                  className="px-3 py-2 rounded-xl border border-border bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value={0}>Playing</option>
                  <option value={2}>Listening</option>
                  <option value={3}>Watching</option>
                  <option value={5}>Competing</option>
                </select>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            onClick={start}
            disabled={loading || !tokens.trim()}
            className="btn-primary flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? "Starting..." : statuses.length > 0 ? "Add / Restart Tokens" : "Start Onliner"}
          </button>
          {statuses.length > 0 && (
            <>
              <button
                onClick={applySettings}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-primary/50 text-primary hover:bg-primary/10 transition-colors"
              >
                Apply Settings
              </button>
              <button
                onClick={stop}
                disabled={stopping}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {stopping ? "Stopping..." : "Stop All"}
              </button>
            </>
          )}
        </div>
      </div>

      {statuses.length > 0 && (
        <div className="rounded-2xl border border-border card-glow" style={{ background: "hsl(var(--card))" }}>
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-semibold">Live Status</span>
            <span className="text-xs text-muted-foreground">
              {onlineCount}/{statuses.length} online
            </span>
          </div>
          <div className="divide-y divide-border">
            {statuses.map((s, i) => (
              <div key={i} className="px-5 py-3 flex items-center gap-3">
                {s.avatar && s.userId ? (
                  <img
                    src={`https://cdn.discordapp.com/avatars/${s.userId}/${s.avatar}.webp?size=32`}
                    className="w-8 h-8 rounded-full flex-shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0 flex items-center justify-center text-xs text-muted-foreground">?</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.username ?? s.tokenPreview}</p>
                  {s.currentStatusText && (
                    <p className="text-xs text-muted-foreground truncate">{s.currentStatusText}</p>
                  )}
                  {s.error && (
                    <p className="text-xs text-red-400 truncate">{s.error}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", statusDot[s.status] ?? "bg-gray-500")} />
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-medium",
                    s.status === "connected" ? "bg-green-500/10 text-green-400" :
                    s.status === "connecting" ? "bg-yellow-500/10 text-yellow-400" :
                    s.status === "error" ? "bg-red-500/10 text-red-400" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {s.status === "connected" ? "Online" : s.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
