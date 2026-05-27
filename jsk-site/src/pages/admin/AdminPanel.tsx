import { useState } from "react";
import { toast } from "sonner";
import type { Session } from "../../App";
import { cn } from "../../lib/utils";

interface Key {
  id: number;
  key: string;
  ownerName: string;
  expiresAt: string;
  createdAt: string;
  isExpired: boolean;
  daysRemaining: number;
}

interface Props {
  session: Session;
}

type Filter = "all" | "active" | "expired";

export default function AdminPanel({ session }: Props) {
  const [keys, setKeys] = useState<Key[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [sortBy, setSortBy] = useState<"created" | "expires">("created");
  const [showExpired, setShowExpired] = useState(false);
  const [newOwner, setNewOwner] = useState("");
  const [newExpiry, setNewExpiry] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const loadKeys = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/keys?adminKey=${encodeURIComponent(session.key)}`);
      if (!res.ok) { toast.error("Unauthorized"); return; }
      const data = (await res.json()) as Key[];
      setKeys(data);
      setLoaded(true);
    } catch {
      toast.error("Connection error");
    } finally {
      setLoading(false);
    }
  };

  const createKey = async () => {
    if (!newOwner.trim() || !newExpiry) { toast.error("Fill in owner name and expiry"); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerName: newOwner.trim(), expiresAt: newExpiry, adminKey: session.key }),
      });
      const data = (await res.json()) as Key & { error?: string };
      if (!res.ok) { toast.error(data.error ?? "Failed"); return; }
      setKeys((prev) => [data, ...prev]);
      setNewOwner("");
      setNewExpiry("");
      toast.success(`Key created: ${data.key}`);
    } catch {
      toast.error("Connection error");
    } finally {
      setCreating(false);
    }
  };

  const deleteKey = async (id: number) => {
    setDeletingId(id);
    try {
      const res = await fetch("/api/admin/keys/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, adminKey: session.key }),
      });
      if (!res.ok) { toast.error("Failed to delete"); return; }
      setKeys((prev) => prev.filter((k) => k.id !== id));
      toast.success("Key deleted");
    } catch {
      toast.error("Connection error");
    } finally {
      setDeletingId(null);
    }
  };

  const deleteAllExpired = async () => {
    const expired = keys.filter((k) => k.isExpired);
    if (expired.length === 0) { toast.info("No expired keys"); return; }
    for (const k of expired) await deleteKey(k.id);
  };

  const copyKey = (k: Key) => {
    navigator.clipboard.writeText(k.key).then(() => {
      setCopiedId(k.id);
      setTimeout(() => setCopiedId(null), 1500);
      toast.success("Copied!");
    });
  };

  const filteredKeys = keys
    .filter((k) => {
      if (filter === "active") return !k.isExpired;
      if (filter === "expired") return k.isExpired;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "expires") return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const activeKeys = filteredKeys.filter((k) => !k.isExpired);
  const expiredKeys = filteredKeys.filter((k) => k.isExpired);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground font-heading">Admin Panel</h2>
        <p className="text-muted-foreground text-sm mt-1">Manage license keys</p>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-border card-glow p-5" style={{ background: "hsl(var(--card))" }}>
          <h3 className="text-sm font-semibold mb-3">Create New Key</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={newOwner}
              onChange={(e) => setNewOwner(e.target.value)}
              placeholder="Owner name"
              className="flex-1 px-3 py-2.5 rounded-xl border border-border bg-input text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="date"
              value={newExpiry}
              onChange={(e) => setNewExpiry(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-border bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={createKey}
              disabled={creating}
              className="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {creating ? "Creating..." : "Create"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-border card-glow" style={{ background: "hsl(var(--card))" }}>
          <div className="px-5 py-3 border-b border-border flex items-center gap-3 flex-wrap">
            <div className="flex gap-1.5">
              {(["all", "active", "expired"] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all",
                    filter === f ? "btn-primary" : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f} {f === "all" ? `(${keys.length})` : f === "active" ? `(${keys.filter(k => !k.isExpired).length})` : `(${keys.filter(k => k.isExpired).length})`}
                </button>
              ))}
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "created" | "expires")}
              className="ml-auto px-3 py-1.5 rounded-lg border border-border bg-input text-foreground text-xs focus:outline-none"
            >
              <option value="created">Sort: Newest</option>
              <option value="expires">Sort: Expiry</option>
            </select>
            {!loaded ? (
              <button
                onClick={loadKeys}
                disabled={loading}
                className="btn-primary px-4 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
              >
                {loading ? "Loading..." : "Load Keys"}
              </button>
            ) : (
              <button
                onClick={deleteAllExpired}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
              >
                Delete Expired
              </button>
            )}
          </div>

          {!loaded ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Click &quot;Load Keys&quot; to view all license keys
            </div>
          ) : filteredKeys.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No keys found</div>
          ) : (
            <div>
              <div className="divide-y divide-border">
                {activeKeys.map((k) => (
                  <KeyRow key={k.id} k={k} copiedId={copiedId} deletingId={deletingId} onCopy={copyKey} onDelete={deleteKey} />
                ))}
              </div>

              {expiredKeys.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowExpired(!showExpired)}
                    className="w-full px-5 py-3 flex items-center justify-between text-sm text-muted-foreground hover:text-foreground border-t border-border transition-colors"
                  >
                    <span>{expiredKeys.length} expired key{expiredKeys.length !== 1 ? "s" : ""}</span>
                    <svg className={cn("w-4 h-4 transition-transform", showExpired && "rotate-180")} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path d="M6 9l6 6 6-6"/>
                    </svg>
                  </button>
                  {showExpired && (
                    <div className="divide-y divide-border opacity-60">
                      {expiredKeys.map((k) => (
                        <KeyRow key={k.id} k={k} copiedId={copiedId} deletingId={deletingId} onCopy={copyKey} onDelete={deleteKey} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KeyRow({ k, copiedId, deletingId, onCopy, onDelete }: {
  k: Key;
  copiedId: number | null;
  deletingId: number | null;
  onCopy: (k: Key) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="px-5 py-3.5 flex items-center gap-3">
      <div className={cn("w-2 h-2 rounded-full flex-shrink-0", k.isExpired ? "bg-destructive" : "bg-green-400")} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{k.ownerName}</span>
          <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{k.key}</code>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          Expires {new Date(k.expiresAt).toLocaleDateString()}
          {!k.isExpired && <span className="ml-2 text-primary">{k.daysRemaining}d left</span>}
          {k.isExpired && <span className="ml-2 text-destructive">Expired</span>}
        </div>
      </div>
      <button
        onClick={() => onCopy(k)}
        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="Copy key"
      >
        {copiedId === k.id ? (
          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        )}
      </button>
      <button
        onClick={() => onDelete(k.id)}
        disabled={deletingId === k.id}
        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-muted transition-colors disabled:opacity-40"
        title="Delete key"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
        </svg>
      </button>
    </div>
  );
}
