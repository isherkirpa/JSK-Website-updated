import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Products", href: "/products" },
  { label: "Tools", href: "/tools" },
  { label: "Contact", href: "/contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50" style={{ background: "rgba(8, 0, 20, 0.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(179, 26, 255, 0.2)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3 group">
            <img src="/logo.webp" alt="JSK Store" className="w-10 h-10 rounded-full object-cover group-hover:scale-110 transition-transform duration-200" />
            <span className="text-xl font-black tracking-wider gradient-text hidden sm:block">JSK STORE</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-semibold tracking-wide transition-all duration-200 ${
                  location === link.href
                    ? "gradient-purple text-white"
                    : "text-gray-300 hover:text-white hover:bg-purple-900/30"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <a
              href="https://discord.gg/udHrZrp6Rw"
              target="_blank"
              rel="noreferrer"
              className="ml-3 px-5 py-2 rounded-xl text-sm font-bold text-white gradient-purple glow-btn transition-all duration-200 hover:scale-105"
            >
              Join Discord
            </a>
          </div>

          <button
            className="md:hidden text-gray-300 hover:text-white p-2"
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden px-4 pb-4 space-y-1" style={{ background: "rgba(8, 0, 20, 0.98)" }}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={`block px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                location === link.href
                  ? "gradient-purple text-white"
                  : "text-gray-300 hover:text-white hover:bg-purple-900/30"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <a
            href="https://discord.gg/udHrZrp6Rw"
            target="_blank"
            rel="noreferrer"
            className="block px-4 py-3 rounded-xl text-sm font-bold text-white text-center gradient-purple"
          >
            Join Discord
          </a>
        </div>
      )}
    </nav>
  );
}
