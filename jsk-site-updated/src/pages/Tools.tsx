import { Link } from "wouter";
import { MessageSquare, ShieldCheck, Wifi, ChevronRight, Wrench, Sparkles, Shield, Server, Zap } from "lucide-react";

const tools = [
  {
    id: "mass-dm",
    icon: <MessageSquare size={28} className="text-purple-400" />,
    name: "Mass DM Sender",
    desc: "Send direct messages to all your Discord friends using your User Token. Configurable delay and live progress.",
    href: "/tools/mass-dm",
    tags: ["DM", "Friends", "Automation"],
  },
  {
    id: "token-checker",
    icon: <ShieldCheck size={28} className="text-green-400" />,
    name: "Token Checker",
    desc: "Verify multiple Discord tokens at once. See valid/invalid status with avatar, nitro plan, server count, account age and full info.",
    href: "/tools/token-checker",
    tags: ["Token", "Verify", "Bulk"],
  },
  {
    id: "onliner",
    icon: <Wifi size={28} className="text-blue-400" />,
    name: "Discord Onliner",
    desc: "Keep Discord accounts online 24/7 via Bot Server. Custom status, emoji, activity, rotating statuses — never goes offline.",
    href: "/tools/onliner",
    tags: ["Status", "Online", "24/7"],
    badge: "Updated",
  },
  {
    id: "server-joiner",
    icon: <Server size={28} className="text-pink-400" />,
    name: "Server Joiner",
    desc: "Join or leave Discord servers with multiple tokens automatically. Runs via bot server with configurable delay.",
    href: "/tools/server-joiner",
    tags: ["Server", "Join", "Leave"],
    badge: "Updated",
  },
  {
    id: "booster",
    icon: <Zap size={28} className="text-yellow-400" />,
    name: "Server Boost",
    desc: "Apply custom nickname, bio, avatar, and banner to multiple Discord tokens in a server. Bulk profile editor.",
    href: "/tools/booster",
    tags: ["Profile", "Nick", "Avatar"],
    badge: "New",
  },
];

export default function Tools() {
  return (
    <div className="pt-16 min-h-screen">
      <div className="hero-bg py-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-purple-300 mb-5" style={{ background: "rgba(179,26,255,0.15)", border: "1px solid rgba(179,26,255,0.3)" }}>
          <Sparkles size={12} /> Free Discord Tools
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-3">
          JSK <span className="gradient-text">Tools</span>
        </h1>
        <p className="text-gray-400 max-w-xl mx-auto px-4">
          Powerful tools for Discord users. Each tool requires a unique access key — contact admin on Discord.
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white gradient-purple glow-btn transition-all hover:scale-105"
          >
            <Shield size={14} /> Admin Login
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-14">
        <div className="flex items-center gap-3 mb-8">
          <Wrench size={20} className="text-purple-400" />
          <h2 className="text-xl font-bold text-white">Available Tools</h2>
          <span className="text-xs text-gray-500">🔑 Key required for each tool</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-16">
          {tools.map((tool) => (
            <Link key={tool.id} href={tool.href}
              className="group card-dark rounded-2xl p-6 cursor-pointer hover:border-purple-500/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl relative overflow-hidden"
              style={{ border: "1px solid rgba(179,26,255,0.15)" }}>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: "radial-gradient(ellipse at top left, rgba(179,26,255,0.06), transparent 60%)" }} />
              {tool.badge && (
                <span className="absolute top-4 right-4 text-xs font-bold px-2 py-0.5 rounded-full gradient-purple text-white">
                  {tool.badge}
                </span>
              )}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(179,26,255,0.12)" }}>
                  {tool.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-bold text-lg mb-1">{tool.name}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{tool.desc}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-2 flex-wrap">
                  {tool.tags.map((tag) => (
                    <span key={tag} className="text-xs px-2.5 py-1 rounded-full text-purple-300 font-medium"
                      style={{ background: "rgba(179,26,255,0.12)", border: "1px solid rgba(179,26,255,0.2)" }}>
                      {tag}
                    </span>
                  ))}
                </div>
                <ChevronRight size={18} className="text-gray-600 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
