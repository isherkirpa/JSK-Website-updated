import { Link } from "wouter";
import { MessageCircle, Shield, Zap } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t" style={{ borderColor: "rgba(179,26,255,0.15)", background: "rgba(5,0,15,0.9)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src="/logo.webp" alt="JSK Store" className="w-10 h-10 rounded-full" />
              <span className="text-xl font-black gradient-text">JSK STORE</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              #1 Discord Boosting Store. Fast delivery, secure payments, 24/7 support.
            </p>
            <div className="flex gap-3 mt-4">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Shield size={14} className="text-purple-400" />
                <span>Secure</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Zap size={14} className="text-pink-400" />
                <span>Fast Delivery</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <MessageCircle size={14} className="text-purple-400" />
                <span>24/7 Support</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Quick Links</h3>
            <ul className="space-y-2">
              {[
                { label: "Home", href: "/" },
                { label: "Products", href: "/products" },
                { label: "Tools", href: "/tools" },
                { label: "Contact", href: "/contact" },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-gray-400 hover:text-purple-400 text-sm transition-colors duration-200">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Contact Us</h3>
            <p className="text-gray-400 text-sm mb-3">For support or orders, reach us on Discord:</p>
            <a
              href="https://discord.gg/udHrZrp6Rw"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white gradient-purple hover:opacity-90 transition-opacity"
            >
              <MessageCircle size={16} />
              Join Discord Server
            </a>
          </div>
        </div>

        <div className="border-t mt-8 pt-6 text-center" style={{ borderColor: "rgba(179,26,255,0.1)" }}>
          <p className="text-gray-500 text-xs">
            &copy; {new Date().getFullYear()} JSK Store. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
