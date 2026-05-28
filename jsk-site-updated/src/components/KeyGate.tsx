import { useState, useEffect } from "react";
import { Key, Eye, EyeOff, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { validateKey, type ToolId } from "@/lib/keyManager";

const LS_PREFIX = "jsk_key_";

type KeyGateProps = {
  toolId: ToolId;
  toolName: string;
  children: React.ReactNode | ((key: string) => React.ReactNode);
};

export default function KeyGate({ toolId, toolName, children }: KeyGateProps) {
  const [key, setKey] = useState(() => localStorage.getItem(`${LS_PREFIX}${toolId}`) ?? "");
  const [input, setInput] = useState(key);
  const [show, setShow] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [valid, setValid] = useState(false);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);

  // Auto-validate saved key on mount
  useEffect(() => {
    if (!key) return;
    setChecking(true);
    validateKey(toolId, key).then((result) => {
      if (result.valid) {
        setValid(true);
        setExpiresAt(result.expiresAt ?? null);
      } else {
        localStorage.removeItem(`${LS_PREFIX}${toolId}`);
        setKey("");
        setInput("");
        setError("Saved key has expired or is invalid.");
      }
      setChecking(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setChecking(true);
    setError("");
    const result = await validateKey(toolId, input.trim().toUpperCase());
    if (result.valid) {
      const normalized = input.trim().toUpperCase();
      localStorage.setItem(`${LS_PREFIX}${toolId}`, normalized);
      setKey(normalized);
      setValid(true);
      setExpiresAt(result.expiresAt ?? null);
    } else {
      setError(result.reason === "expired" ? "This key has expired." : "Invalid key. Contact admin on Discord.");
    }
    setChecking(false);
  };

  const handleLogout = () => {
    localStorage.removeItem(`${LS_PREFIX}${toolId}`);
    setKey("");
    setInput("");
    setValid(false);
    setExpiresAt(null);
    setError("");
  };

  if (checking && !valid) {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="text-purple-400 animate-spin" />
      </div>
    );
  }

  if (valid) {
    const content = typeof children === "function" ? children(key) : children;
    return (
      <div>
        {/* Key badge */}
        <div className="fixed top-[68px] right-4 z-40 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs text-green-300 font-semibold"
          style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", backdropFilter: "blur(8px)" }}>
          <CheckCircle size={12} className="text-green-400" />
          {expiresAt ? `Key valid · ${Math.max(0, Math.round((expiresAt - Date.now()) / 3600000))}h left` : "Key valid · Never expires"}
          <button onClick={handleLogout} className="ml-1 text-gray-500 hover:text-red-400 transition-colors text-xs">✕</button>
        </div>
        {content}
      </div>
    );
  }

  return (
    <div className="pt-16 min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 gradient-purple">
            <Key size={28} className="text-white" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">{toolName}</h2>
          <p className="text-gray-400 text-sm">This tool requires an access key. Contact admin on Discord to get one.</p>
        </div>

        <form onSubmit={handleSubmit} className="card-dark rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Access Key</label>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={input}
                onChange={(e) => setInput(e.target.value.toUpperCase())}
                placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
                className="w-full px-4 py-3 pr-12 rounded-xl text-sm text-white placeholder-gray-600 font-mono tracking-widest outline-none"
                style={{ background: "rgba(179,26,255,0.07)", border: `1px solid ${error ? "rgba(239,68,68,0.5)" : "rgba(179,26,255,0.2)"}` }}
                autoComplete="off"
                spellCheck={false}
              />
              <button type="button" onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {error && (
              <div className="flex items-center gap-1.5 mt-2">
                <AlertTriangle size={13} className="text-red-400 shrink-0" />
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}
          </div>

          <button type="submit" disabled={checking || !input.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white gradient-purple glow-btn transition-all hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100">
            {checking ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} />}
            {checking ? "Verifying..." : "Access Tool"}
          </button>
        </form>
      </div>
    </div>
  );
}
