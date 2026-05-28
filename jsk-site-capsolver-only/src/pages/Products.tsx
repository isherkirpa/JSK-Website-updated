import { useState } from "react";
import { Rocket, Star, Users, Shield, ChevronRight, Sparkles } from "lucide-react";
import imgBoost from "@/assets/product-boost.jpg";
import imgNitro from "@/assets/product-nitro.jpg";
import imgMembers from "@/assets/product-members.jpg";
import imgAccount from "@/assets/product-account.jpg";
import imgCustom from "@/assets/product-custom.jpg";

type Category = "all" | "boosts" | "nitro" | "members" | "accounts" | "custom";

const categories = [
  { id: "all", label: "All Products" },
  { id: "boosts", label: "Server Boosts" },
  { id: "nitro", label: "Nitro" },
  { id: "members", label: "Members" },
  { id: "accounts", label: "Accounts" },
  { id: "custom", label: "Custom" },
];

const categoryImages: Record<string, string> = {
  boosts: imgBoost,
  nitro: imgNitro,
  members: imgMembers,
  accounts: imgAccount,
  custom: imgCustom,
};

const categoryIcons: Record<string, React.ReactNode> = {
  boosts: <Rocket size={16} />,
  nitro: <Star size={16} />,
  members: <Users size={16} />,
  accounts: <Shield size={16} />,
  custom: <Sparkles size={16} />,
};

type Product = {
  id: number;
  category: Exclude<Category, "all">;
  name: string;
  price: string;
  badge: string | null;
  desc: string;
};

const products: Product[] = [
  { id: 1, category: "boosts", name: "8 Boosts - 1 Month", price: "$5.99", badge: null, desc: "Level up your server with 8 boosts for 1 month." },
  { id: 2, category: "boosts", name: "14 Boosts - 1 Month", price: "$9.99", badge: "Popular", desc: "14 boosts to unlock more server perks for 1 month." },
  { id: 3, category: "boosts", name: "20 Boosts - 1 Month", price: "$12.99", badge: null, desc: "Get Level 3 with 20 boosts for 1 month." },
  { id: 4, category: "boosts", name: "30 Boosts - 1 Month", price: "$19.99", badge: null, desc: "Maximum boosts pack — 30 boosts for 1 month." },
  { id: 5, category: "boosts", name: "8 Boosts - 3 Month", price: "$14.99", badge: null, desc: "8 boosts lasting 3 full months." },
  { id: 6, category: "boosts", name: "14 Boosts - 3 Month", price: "$24.99", badge: "Best Value", desc: "14 boosts lasting 3 full months." },
  { id: 7, category: "boosts", name: "20 Boosts - 3 Month", price: "$32.99", badge: null, desc: "Level 3 for 3 months — best deal for active servers." },
  { id: 8, category: "boosts", name: "30 Boosts - 3 Month", price: "$47.99", badge: null, desc: "30 boosts for 3 months — ultimate server upgrade." },
  { id: 9, category: "nitro", name: "Nitro 1 Month", price: "$6.99", badge: null, desc: "Full Discord Nitro for 1 month with all perks." },
  { id: 10, category: "nitro", name: "Nitro 1 Year", price: "$69", badge: "Best Deal", desc: "Full Discord Nitro for 12 months — save big!" },
  { id: 11, category: "members", name: "1k Offline Members", price: "$4.99", badge: null, desc: "1000 offline Discord members added to your server." },
  { id: 12, category: "members", name: "1k Online Members", price: "$9.99", badge: "Popular", desc: "1000 online Discord members — looks fully active." },
  { id: 13, category: "members", name: "1k Real Members", price: "$14.99", badge: null, desc: "1000 real organic Discord members for serious servers." },
  { id: 14, category: "accounts", name: "2015 Account", price: "$69", badge: null, desc: "Rare 2015 OG Discord account with vintage username." },
  { id: 15, category: "accounts", name: "2016 Account", price: "$49", badge: null, desc: "Rare 2016 OG Discord account." },
  { id: 16, category: "accounts", name: "2017 Account", price: "$29", badge: null, desc: "Aged 2017 OG Discord account." },
  { id: 17, category: "accounts", name: "2018 Account", price: "$19", badge: null, desc: "Aged 2018 OG Discord account." },
  { id: 18, category: "accounts", name: "2023 Account", price: "$5", badge: null, desc: "Verified 2023 Discord account." },
  { id: 19, category: "custom", name: "Custom Pay", price: "Custom", badge: null, desc: "Need something specific? Contact us for custom orders." },
];

export default function Products() {
  const [active, setActive] = useState<Category>("all");
  const [query, setQuery] = useState("");

  const filtered = products.filter((p) => {
    const matchCat = active === "all" || p.category === active;
    const matchQuery = !query || p.name.toLowerCase().includes(query.toLowerCase());
    return matchCat && matchQuery;
  });

  return (
    <div className="pt-16 min-h-screen">
      <div className="hero-bg py-16 text-center">
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-3">
          Our <span className="gradient-text">Products</span>
        </h1>
        <p className="text-gray-400 max-w-xl mx-auto px-4">
          Choose from our wide range of Discord services at the best prices.
        </p>
        <div className="max-w-md mx-auto mt-6 px-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products..."
            className="w-full px-5 py-3 rounded-xl text-sm text-white placeholder-gray-500 outline-none"
            style={{ background: "rgba(179,26,255,0.08)", border: "1px solid rgba(179,26,255,0.25)" }}
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActive(cat.id as Category)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                active === cat.id ? "gradient-purple text-white" : "text-gray-300 hover:text-white"
              }`}
              style={
                active !== cat.id
                  ? { background: "rgba(179,26,255,0.1)", border: "1px solid rgba(179,26,255,0.2)" }
                  : {}
              }
            >
              {cat.id !== "all" && categoryIcons[cat.id]}
              {cat.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((product) => (
            <div
              key={product.id}
              className="relative card-dark rounded-2xl overflow-hidden neon-border-hover transition-all duration-300 flex flex-col group"
            >
              {product.badge && (
                <div className="absolute top-3 right-3 z-10 px-3 py-1 rounded-full text-xs font-bold text-white gradient-purple shadow-lg">
                  {product.badge}
                </div>
              )}
              <div
                className="relative aspect-square overflow-hidden"
                style={{ background: "linear-gradient(135deg, rgba(123,31,212,0.25), rgba(179,26,255,0.1))" }}
              >
                <img
                  src={categoryImages[product.category]}
                  alt={product.name}
                  loading="lazy"
                  width={512}
                  height={512}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <div className="p-5 flex flex-col flex-1">
                <h3 className="text-white font-bold text-base mb-1">{product.name}</h3>
                <p className="text-gray-400 text-xs mb-4 flex-1 leading-relaxed line-clamp-2">{product.desc}</p>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl font-black gradient-text">{product.price}</span>
                  <span className="text-xs text-purple-400 font-semibold uppercase tracking-wide capitalize">
                    {product.category}
                  </span>
                </div>
                <a
                  href="https://discord.gg/udHrZrp6Rw"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-lg text-xs font-bold text-white gradient-purple hover:opacity-90 transition-opacity"
                >
                  Buy Now <ChevronRight size={12} />
                </a>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20 text-gray-500">No products found.</div>
        )}

        <div
          className="mt-16 text-center rounded-3xl p-10"
          style={{
            background: "linear-gradient(135deg, rgba(123,31,212,0.2), rgba(179,26,255,0.1))",
            border: "1px solid rgba(179,26,255,0.25)",
          }}
        >
          <h2 className="text-2xl font-black text-white mb-3">Need Something Custom?</h2>
          <p className="text-gray-400 mb-6">
            Contact us on Discord for bulk orders, custom quantities, or special deals.
          </p>
          <a
            href="https://discord.gg/udHrZrp6Rw"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold text-white gradient-purple hover:opacity-90 transition-all duration-200 hover:scale-105"
          >
            Contact on Discord
          </a>
        </div>
      </div>
    </div>
  );
}
