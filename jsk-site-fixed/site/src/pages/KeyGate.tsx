import { useState } from "react";
import { toast } from "sonner";
import type { Session } from "../App";
import { cn } from "../lib/utils";
import { apiUrl } from "../lib/api";

interface Props {
  onLogin: (session: Session) => void;
}

export default function KeyGate({ onLogin }: Props) {
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/keys/validate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: key.trim() }),
      });
      const data = (await res.json()) as {
        valid: boolean;
        isAdmin: boolean;
        ownerName: string | null;
        expiresAt: string | null;
        daysRemaining: number | null;
        error: string | null;
      };
      if (data.valid) {
        onLogin({
          key: key.trim(),
          isAdmin: data.isAdmin,
          ownerName: data.ownerName,
          expiresAt: data.expiresAt,
          daysRemaining: data.daysRemaining,
        });
        toast.success(`Welcome${data.ownerName ? `, ${data.ownerName}` : ""}!`);
      } else {
        toast.error(data.error ?? "Invalid key");
      }
    } catch {
      toast.error("Connection error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6"
               style={{ background: "linear-gradient(135deg, hsl(325 90% 58%), hsl(283 55% 50%))" }}>
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
            </svg>
          </div>
          <h1 className="text-4xl font-bold gradient-text mb-2">JSK Tools</h1>
          <p className="text-muted-foreground text-sm">Enter your license key to continue</p>
        </div>

        <div className="rounded-2xl border border-border card-glow p-8"
             style={{ background: "hsl(var(--card))" }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                License Key
              </label>
              <input
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="JSK-XXXXXXXXXXXXXXXX"
                className={cn(
                  "w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground",
                  "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring",
                  "font-mono text-sm tracking-widest transition-all",
                )}
                spellCheck={false}
                autoComplete="off"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !key.trim()}
              className="btn-primary w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Verifying...
                </span>
              ) : "Access Tools"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Don&apos;t have a key?{" "}
          <a href="#" className="text-primary hover:underline">Contact support</a>
        </p>
      </div>
    </div>
  );
}
