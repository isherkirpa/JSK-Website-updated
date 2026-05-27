import { useState } from "react";
import { toast } from "sonner";
import type { Session } from "../../App";
import { cn } from "../../lib/utils";
import { apiUrl } from "../../lib/api";

interface TokenResult {
  token: string;
  success: boolean;
  message: string;
}

interface Props {
  session: Session;
}

export default function JoinerTool({ session }: Props) {
  const [tokens, setTokens] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [guildId, setGuildId] = useState("");
  const [delayMs, setDelayMs] = useState("1500");
  const [mode, setMode] = useState<"join" | "leave">("join");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TokenResult[]>([]);

  const run = async () => {
    const tokenList = tokens.split(/[\n,]+/).map((t) => t.trim()).filter(Boolean);
    if (tokenList.length === 0) { toast.error("Enter at least one token"); return; }
    if (mode === "join" && !inviteCode.trim()) { toast.error("Enter an invite code"); return; }
    if (mode === "leave" && !guildId.trim()) { toast.error("Enter a Guild ID"); return; }

    setLoading(true);
    setResults([]);
    try {
      const endpoint = mode === "join" ? "/api/joiner/join" : "/api/joiner/leave";
      const body = mode === "join"
        ? { key: session.key, tokens: tokenList, inviteCode: inviteCode.trim(), delayMs: Number(delayMs) }
        : { key: session.key, tokens: tokenList, guildId: guildId.trim() };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { success: number; failed: number; results: TokenResult[]; error?: string };
      if (!res.ok) { toast.error(data.error ?? "Failed"); return; }
      setResults(data.results);
      toast.success(`Done — ${data.success} succeeded, ${data.failed} failed`);
    } catch {
      toast.error("Connection error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground font-heading">Server Joiner</h2>
        <p className="text-muted-foreground text-sm mt-1">Join or leave Discord servers with multiple accounts</p>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-border card-glow p-5" style={{ background: "hsl(var(--card))" }}>
          <div className="flex gap-2 mb-4">
            {(["join", "leave"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "flex-1 py-2 rounded-xl text-sm font-semibold transition-all capitalize",
                  mode === m ? "btn-primary" : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-2">Tokens <span className="text-muted-foreground">(one per line)</span></label>
              <textarea
                value={tokens}
                onChange={(e) => setTokens(e.target.value)}
                placeholder="Paste tokens here..."
                rows={5}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-input text-foreground text-xs font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            {mode === "join" ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-2">Invite Code / Link</label>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="discord.gg/xxxxx"
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-input text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Delay (ms)</label>
                  <input
                    type="number"
                    value={delayMs}
                    onChange={(e) => setDelayMs(e.target.value)}
                    min={0}
                    max={10000}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-input text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-2">Guild ID</label>
                <input
                  type="text"
                  value={guildId}
                  onChange={(e) => setGuildId(e.target.value)}
                  placeholder="123456789012345678"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-input text-foreground text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}

            <button
              onClick={run}
              disabled={loading}
              className="btn-primary w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? `${mode === "join" ? "Joining" : "Leaving"}... (this may take a while)` : `${mode === "join" ? "Join" : "Leave"} Server`}
            </button>
          </div>
        </div>

        {results.length > 0 && (
          <div className="rounded-2xl border border-border card-glow" style={{ background: "hsl(var(--card))" }}>
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <span className="text-sm font-semibold">Results</span>
              <div className="flex gap-3 text-xs">
                <span className="text-green-400">{results.filter(r => r.success).length} ok</span>
                <span className="text-destructive">{results.filter(r => !r.success).length} fail</span>
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-border">
              {results.map((r, i) => (
                <div key={i} className="px-5 py-2.5 flex items-center gap-3">
                  <span className={cn("text-xs", r.success ? "text-green-400" : "text-destructive")}>
                    {r.success ? "✓" : "✗"}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground flex-shrink-0">{r.token}</span>
                  <span className="text-xs text-muted-foreground truncate">{r.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
