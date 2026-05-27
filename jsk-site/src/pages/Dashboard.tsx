import { useState } from "react";
import type { Session } from "../App";
import OnlinerTool from "./tools/OnlinerTool";
import JoinerTool from "./tools/JoinerTool";
import BoosterTool from "./tools/BoosterTool";
import AdminPanel from "./admin/AdminPanel";
import { cn } from "../lib/utils";

type Tool = "onliner" | "joiner" | "booster" | "admin";

interface Props {
  session: Session;
  onLogout: () => void;
}

const navItems = [
  {
    id: "onliner" as Tool,
    label: "Onliner",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"/><path d="M8 12l2 2 4-4"/>
      </svg>
    ),
  },
  {
    id: "joiner" as Tool,
    label: "Server Joiner",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    id: "booster" as Tool,
    label: "Booster",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    ),
  },
];

export default function Dashboard({ session, onLogout }: Props) {
  const [active, setActive] = useState<Tool>("onliner");

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 flex-shrink-0 flex flex-col border-r border-sidebar-border"
             style={{ background: "hsl(var(--sidebar))" }}>
        <div className="p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ background: "linear-gradient(135deg, hsl(325 90% 58%), hsl(283 55% 50%))" }}>
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-sidebar-foreground font-heading">JSK Tools</h1>
              <p className="text-xs text-muted-foreground truncate">
                {session.isAdmin ? "Admin" : session.ownerName ?? "User"}
              </p>
            </div>
          </div>
        </div>

        {!session.isAdmin && session.expiresAt && (
          <div className="mx-3 mt-3 px-3 py-2 rounded-lg border border-border text-xs"
               style={{ background: "hsl(var(--muted))" }}>
            <span className="text-muted-foreground">Expires in </span>
            <span className={cn("font-semibold", (session.daysRemaining ?? 0) <= 3 ? "text-destructive" : "text-primary")}>
              {session.daysRemaining ?? 0}d
            </span>
          </div>
        )}

        <nav className="flex-1 p-3 space-y-1 mt-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                active === item.id
                  ? "text-sidebar-primary-foreground"
                  : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent",
              )}
              style={active === item.id ? {
                background: "linear-gradient(135deg, hsl(325 90% 58% / 0.2), hsl(283 55% 50% / 0.2))",
                color: "hsl(325 90% 70%)",
                borderLeft: "2px solid hsl(325 90% 58%)",
              } : {}}
            >
              {item.icon}
              {item.label}
            </button>
          ))}

          {session.isAdmin && (
            <button
              onClick={() => setActive("admin")}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mt-2",
                active === "admin"
                  ? "text-sidebar-primary-foreground"
                  : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent",
              )}
              style={active === "admin" ? {
                background: "linear-gradient(135deg, hsl(325 90% 58% / 0.2), hsl(283 55% 50% / 0.2))",
                color: "hsl(325 90% 70%)",
                borderLeft: "2px solid hsl(325 90% 58%)",
              } : {}}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              Admin Panel
            </button>
          )}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-destructive hover:bg-muted transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {active === "onliner" && <OnlinerTool session={session} />}
        {active === "joiner" && <JoinerTool session={session} />}
        {active === "booster" && <BoosterTool session={session} />}
        {active === "admin" && session.isAdmin && <AdminPanel session={session} />}
      </main>
    </div>
  );
}
