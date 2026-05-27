import { Link } from "wouter";
import { motion } from "framer-motion";
import { Rocket, Shield, Zap, Users, Star, ChevronRight, Sparkles, Wrench } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
};

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const stats = [
  { value: "5000+", label: "Happy Buyers" },
  { value: "99.9%", label: "Satisfaction Rate" },
  { value: "24/7", label: "Support" },
  { value: "Instant", label: "Delivery" },
];

const features = [
  {
    icon: <Zap size={22} className="text-yellow-400" />,
    title: "Instant Delivery",
    desc: "Boosts and products delivered within minutes of payment.",
  },
  {
    icon: <Shield size={22} className="text-green-400" />,
    title: "Secure & Safe",
    desc: "Encrypted payments and verified accounts. Your safety is our priority.",
  },
  {
    icon: <Users size={22} className="text-purple-400" />,
    title: "24/7 Support",
    desc: "Our team is always online to assist you anytime.",
  },
  {
    icon: <Star size={22} className="text-pink-400" />,
    title: "Best Prices",
    desc: "Lowest prices in the market guaranteed. No hidden fees.",
  },
];

const featuredProducts = [
  { name: "8 Boosts - 1 Month", category: "Server Boost", price: "$5.99", popular: false },
  { name: "30 Boosts - 1 Month", category: "Server Boost", price: "$19.99", popular: true },
  { name: "Nitro 1 Year", category: "Discord Nitro", price: "$69", popular: false },
];

export default function Home() {
  return (
    <div className="pt-16">
      <section className="relative min-h-[90vh] flex items-center justify-center hero-bg overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            className="absolute top-20 left-10 w-72 h-72 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, #b31aff, transparent)" }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.08, 0.14, 0.08] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-20 right-10 w-96 h-96 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, #ff1aff, transparent)" }}
            animate={{ scale: [1, 1.12, 1], opacity: [0.08, 0.13, 0.08] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <motion.div
            className="inline-block mb-6"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.img
              src="/logo.webp"
              alt="JSK Store"
              className="w-28 h-28 rounded-full mx-auto"
              style={{ boxShadow: "0 0 40px rgba(179,26,255,0.5)" }}
              animate={{ y: [0, -8, 0], boxShadow: ["0 0 40px rgba(179,26,255,0.4)", "0 0 60px rgba(179,26,255,0.7)", "0 0 40px rgba(179,26,255,0.4)"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>

          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-purple-300 mb-6"
            style={{ background: "rgba(179,26,255,0.15)", border: "1px solid rgba(179,26,255,0.3)" }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <Sparkles size={12} />
            #1 Discord Boosting Store
          </motion.div>

          <motion.h1
            className="text-5xl sm:text-7xl font-black tracking-tight mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="gradient-text">JSK</span>{" "}
            <span className="text-white">STORE</span>
          </motion.h1>

          <motion.p
            className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.35 }}
          >
            Buy cheap Discord server boosts, Nitro gifts, members and OG accounts.
            Fast delivery, 24/7 support, secure payments.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.45 }}
          >
            <Link href="/products" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-base font-bold text-white gradient-purple glow-btn transition-all duration-200 hover:scale-105 hover:opacity-90">
              <Rocket size={18} />
              Shop Now
              <ChevronRight size={16} />
            </Link>
            <Link href="/tools" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-base font-bold text-purple-300 transition-all duration-200 hover:scale-105" style={{ background: "rgba(179,26,255,0.1)", border: "1px solid rgba(179,26,255,0.4)" }}>
              <Wrench size={18} />
              Free Tools
            </Link>
            <a href="https://discord.gg/udHrZrp6Rw" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-base font-bold text-gray-300 transition-all duration-200 hover:text-white hover:scale-105" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
              Join Discord
            </a>
          </motion.div>
        </div>
      </section>

      <motion.section
        className="py-12 border-y"
        style={{ borderColor: "rgba(179,26,255,0.1)", background: "rgba(20,5,40,0.5)" }}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        variants={staggerContainer}
      >
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <motion.div key={stat.label} className="text-center" variants={fadeUp} custom={i}>
                <div className="text-3xl font-black gradient-text mb-1">{stat.value}</div>
                <div className="text-sm text-gray-400">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      <motion.section
        className="py-20 max-w-7xl mx-auto px-4"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={staggerContainer}
      >
        <motion.div className="text-center mb-14" variants={fadeUp}>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">
            Featured <span className="gradient-text">Products</span>
          </h2>
          <p className="text-gray-400">Most popular items from our store</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {featuredProducts.map((p, i) => (
            <motion.div
              key={p.name}
              className={`relative card-dark rounded-2xl p-6 transition-all duration-300 cursor-pointer ${p.popular ? "neon-border" : "neon-border-hover"}`}
              variants={fadeUp}
              custom={i + 1}
              whileHover={{ y: -6, boxShadow: "0 20px 50px -10px rgba(179,26,255,0.4)" }}
            >
              {p.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white gradient-purple">
                  Most Popular
                </div>
              )}
              <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2">{p.category}</div>
              <h3 className="text-lg font-bold text-white mb-3">{p.name}</h3>
              <div className="text-3xl font-black gradient-text mb-6">{p.price}</div>
              <a
                href="https://discord.gg/udHrZrp6Rw"
                target="_blank"
                rel="noreferrer"
                className="block w-full text-center py-2.5 rounded-xl text-sm font-bold text-white gradient-purple hover:opacity-90 transition-opacity"
              >
                Buy Now
              </a>
            </motion.div>
          ))}
        </div>
        <motion.div className="text-center" variants={fadeUp} custom={4}>
          <Link href="/products" className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold text-purple-300 transition-all duration-200 hover:scale-105" style={{ background: "rgba(179,26,255,0.1)", border: "1px solid rgba(179,26,255,0.3)" }}>
            View All Products <ChevronRight size={16} />
          </Link>
        </motion.div>
      </motion.section>

      <motion.section
        className="py-20 max-w-7xl mx-auto px-4"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={staggerContainer}
      >
        <motion.div className="text-center mb-14" variants={fadeUp}>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">
            Why Choose <span className="gradient-text">JSK Store</span>
          </h2>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              className="card-dark rounded-2xl p-6 transition-all duration-300"
              variants={fadeUp}
              custom={i + 1}
              whileHover={{ y: -5, borderColor: "rgba(179,26,255,0.5)", boxShadow: "0 20px 40px -10px rgba(179,26,255,0.3)" }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: "rgba(179,26,255,0.15)" }}>
                {f.icon}
              </div>
              <h3 className="text-white font-bold mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      <motion.section
        className="py-20 max-w-7xl mx-auto px-4"
        initial={{ opacity: 0, scale: 0.96 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="rounded-3xl p-10 text-center" style={{ background: "linear-gradient(135deg, rgba(123,31,212,0.3), rgba(179,26,255,0.15))", border: "1px solid rgba(179,26,255,0.3)" }}>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
            Ready to <span className="gradient-text">Boost</span> Your Server?
          </h2>
          <p className="text-gray-300 mb-8 max-w-xl mx-auto">
            Join thousands of happy buyers. Get your server boosted today at the best price.
          </p>
          <motion.a
            href="https://discord.gg/udHrZrp6Rw"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-xl text-base font-bold text-white gradient-purple glow-btn transition-all duration-200"
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.97 }}
          >
            <Rocket size={18} />
            Order Now on Discord
          </motion.a>
        </div>
      </motion.section>
    </div>
  );
}
