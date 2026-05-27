import { MessageCircle, Clock, Zap, Shield } from "lucide-react";

export default function Contact() {
  return (
    <div className="pt-16 min-h-screen">
      <div className="hero-bg py-16 text-center">
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-3">
          Get in <span className="gradient-text">Touch</span>
        </h1>
        <p className="text-gray-400 max-w-xl mx-auto">
          Need help or want to place an order? We are always online.
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[
            { icon: <Clock size={22} className="text-purple-400" />, title: "Response Time", desc: "Usually within 5 minutes on Discord." },
            { icon: <Zap size={22} className="text-yellow-400" />, title: "Fast Orders", desc: "Orders processed and delivered instantly." },
            { icon: <Shield size={22} className="text-green-400" />, title: "Safe Payments", desc: "Encrypted and verified payment methods." },
          ].map((item) => (
            <div key={item.title} className="card-dark rounded-2xl p-6 text-center neon-border-hover transition-all duration-300">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(179,26,255,0.15)" }}>
                {item.icon}
              </div>
              <h3 className="text-white font-bold mb-2">{item.title}</h3>
              <p className="text-gray-400 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="card-dark rounded-3xl p-10 text-center neon-border">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(179,26,255,0.2)" }}>
            <MessageCircle size={36} className="text-purple-400" />
          </div>
          <h2 className="text-3xl font-black text-white mb-4">
            Join Our <span className="gradient-text">Discord</span>
          </h2>
          <p className="text-gray-300 max-w-md mx-auto mb-8 leading-relaxed">
            All orders are placed through our Discord server. Join now to speak with our team,
            place orders, and get instant support.
          </p>
          <a
            href="https://discord.gg/udHrZrp6Rw"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-3 px-10 py-4 rounded-xl text-base font-bold text-white gradient-purple glow-btn transition-all duration-200 hover:scale-105"
          >
            <MessageCircle size={20} />
            Open Discord Server
          </a>
          <p className="text-gray-500 text-xs mt-6">
            Available 24/7. Usually online within minutes.
          </p>
        </div>
      </div>
    </div>
  );
}
