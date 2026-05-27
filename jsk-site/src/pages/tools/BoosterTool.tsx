import { useState, useRef } from "react";
import { toast } from "sonner";
import type { Session } from "../../App";
import { cn } from "../../lib/utils";

interface TokenResult {
  token: string;
  success: boolean;
  message: string;
}

interface Props {
  session: Session;
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function BoosterTool({ session }: Props) {
  const [tokens, setTokens] = useState("");
  const [guildId, setGuildId] = useState("");
  const [nick, setNick] = useState("");
  const [bio, setBio] = useState("");
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
  const [bannerBase64, setBannerBase64] = useState<string | null>(null);
  const [avatarName, setAvatarName] = useState("");
  const [bannerName, setBannerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TokenResult[]>([]);
  const avatarRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (file: File | null, type: "avatar" | "banner") => {
    if (!file) return;
    const b64 = await toBase64(file);
    if (type === "avatar") { setAvatarBase64(b64); setAvatarName(file.name); }
    else { setBannerBase64(b64); setBannerName(file.name); }
  };

  const run = async () => {
    const tokenList = tokens.split(/[\n,]+/).map((t) => t.trim()).filter(Boolean);
    if (tokenList.length === 0) { toast.error("Enter at least one token"); return; }
    if (!guildId.trim()) { toast.error("Enter a Guild ID"); return; }
    if (tokenList.length > 20) { toast.warning("Max 20 tokens. Using first 20."); }
    if (!nick && !bio && !avatarBase64 && !bannerBase64) { toast.error("Set at least one field to apply"); return; }

    setLoading(true);
    setResults([]);
    try {
      const res = await fetch("/api/booster/boost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: session.key,
          tokens: tokenList.slice(0, 20),
          guildId: guildId.trim(),
          nick: nick || null,
          bio: bio || null,
          avatarBase64: avatarBase64 || null,
          bannerBase64: bannerBase64 || null,
        }),
      });
      const data = (await res.json()) as { success: number; failed: number; results: TokenResult[]; error?: string };
      if (!res.ok) { toast.error(data.error ?? "Failed"); return; }
      setResults(data.results);
      toast.success(`Done — ${data.success} ok, ${data.failed} failed`);
    } catch {
      toast.error("Connection error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground font-heading">Booster</h2>
        <p className="text-muted-foreground text-sm mt-1">Set nick, bio, avatar & banner for up to 20 accounts</p>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-border card-glow p-5" style={{ background: "hsl(var(--card))" }}>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-2">Tokens <span className="text-muted-foreground">(max 20)</span></label>
              <textarea
                value={tokens}
                onChange={(e) => setTokens(e.target.value)}
                placeholder="Paste tokens here, one per line..."
                rows={5}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-input text-foreground text-xs font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-2">Nickname</label>
                <input
                  type="text"
                  value={nick}
                  onChange={(e) => setNick(e.target.value)}
                  placeholder="Leave empty to skip"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-input text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Bio</label>
                <input
                  type="text"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Leave empty to skip"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-input text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(["avatar", "banner"] as const).map((type) => (
                <div key={type}>
                  <label className="block text-sm font-medium mb-2 capitalize">{type}</label>
                  <input
                    ref={type === "avatar" ? avatarRef : bannerRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange(e.target.files?.[0] ?? null, type)}
                  />
                  <button
                    onClick={() => (type === "avatar" ? avatarRef : bannerRef).current?.click()}
                    className={cn(
                      "w-full px-3 py-2.5 rounded-xl border border-dashed text-sm transition-colors truncate text-left",
                      (type === "avatar" ? avatarBase64 : bannerBase64)
                        ? "border-primary text-primary bg-primary/5"
                        : "border-border text-muted-foreground hover:border-primary hover:text-foreground",
                    )}
                  >
                    {(type === "avatar" ? avatarName : bannerName) || `Choose ${type}...`}
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={run}
              disabled={loading}
              className="btn-primary w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? "Applying... (this may take a while)" : "Apply to All Tokens"}
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
                  <span className={cn("text-xs flex-shrink-0", r.success ? "text-green-400" : "text-destructive")}>
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
