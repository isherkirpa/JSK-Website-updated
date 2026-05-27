import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { useState } from "react";
import KeyGate from "./pages/KeyGate";
import Dashboard from "./pages/Dashboard";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 10000 } },
});

export interface Session {
  key: string;
  isAdmin: boolean;
  ownerName: string | null;
  expiresAt: string | null;
  daysRemaining: number | null;
}

function App() {
  const [session, setSession] = useState<Session | null>(() => {
    const saved = localStorage.getItem("jsk_session");
    return saved ? (JSON.parse(saved) as Session) : null;
  });

  const handleLogin = (s: Session) => {
    localStorage.setItem("jsk_session", JSON.stringify(s));
    setSession(s);
  };

  const handleLogout = () => {
    localStorage.removeItem("jsk_session");
    setSession(null);
  };

  return (
    <QueryClientProvider client={queryClient}>
      {session ? (
        <Dashboard session={session} onLogout={handleLogout} />
      ) : (
        <KeyGate onLogin={handleLogin} />
      )}
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}

export default App;
