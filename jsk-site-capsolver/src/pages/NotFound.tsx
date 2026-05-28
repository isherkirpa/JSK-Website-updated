import { Link } from "wouter";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="pt-16 min-h-screen flex items-center justify-center text-center px-4">
      <div>
        <div className="text-8xl font-black gradient-text mb-4">404</div>
        <h1 className="text-2xl font-bold text-white mb-3">Page Not Found</h1>
        <p className="text-gray-400 mb-8">This page does not exist or was moved.</p>
        <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white gradient-purple hover:opacity-90 transition-opacity">
          <Home size={16} /> Go Home
        </Link>
      </div>
    </div>
  );
}
