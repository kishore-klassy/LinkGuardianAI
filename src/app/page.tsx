"use client";
import { useState, useEffect, Suspense } from "react";
import { cn, log } from "@/lib/utils";

interface Plan {
  id: string;
  name: string;
  price_inr: number;
  price_usd: number;
  features: string[];
  cta: string;
  popular?: boolean;
}

// ─── SVG Minimal Icons ────────────────────────────────────────────────────────
const Icons = {
  shield: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  ),
  link: () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  ),
  sparkles: () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l-.813-5.096L3 15l5.096-.813L9 9l.813 5.096L15 15l-5.188.904zm7.078-9.078L16 10.5l-.891-3.674L11.5 6l3.609-.826L16 1.5l.891 3.674L20.5 6l-3.609.826z" />
    </svg>
  ),
  youtube: () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
    </svg>
  ),
  alert: () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  ),
  arrowRight: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  ),
  play: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
    </svg>
  ),
  check: () => (
    <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  ),
  close: () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  menu: () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  )
};

function NavBar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <nav
      className={cn(
        "fixed top-0 w-full z-50 transition-all duration-300",
        scrolled
          ? "bg-[#09090b]/80 backdrop-blur-xl border-b border-zinc-800/80"
          : "bg-transparent border-b border-transparent"
      )}
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/10">
            {Icons.shield()}
          </div>
          <span className="font-extrabold text-lg tracking-tight text-white">
            Expire<span className="text-indigo-400">LinkX</span>
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
        </div>
        <div className="flex items-center gap-4">
          <a href="/login" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Sign In</a>
          <a
            href="https://chromewebstore.google.com"
            target="_blank"
            className="text-xs font-semibold bg-white text-zinc-950 px-4.5 py-2.5 rounded-xl hover:bg-zinc-200 transition-colors shadow-sm hidden sm:inline-block"
          >
            Add to Chrome
          </a>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden text-zinc-400 hover:text-white transition-colors">
            {mobileOpen ? Icons.close() : Icons.menu()}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <div className="md:hidden bg-[#0c0c0e] border-b border-zinc-800 px-6 py-6 space-y-4 animate-fadeIn">
          <a href="#features" className="block text-sm font-medium text-zinc-400 hover:text-white" onClick={() => setMobileOpen(false)}>Features</a>
          <a href="#pricing" className="block text-sm font-medium text-zinc-400 hover:text-white" onClick={() => setMobileOpen(false)}>Pricing</a>
          <a href="#faq" className="block text-sm font-medium text-zinc-400 hover:text-white" onClick={() => setMobileOpen(false)}>FAQ</a>
          <a
            href="https://chromewebstore.google.com"
            target="_blank"
            className="block text-sm font-semibold bg-white text-zinc-950 text-center py-3 rounded-xl hover:bg-zinc-200 transition-colors"
          >
            Add to Chrome
          </a>
        </div>
      )}
    </nav>
  );
}

function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-32 pb-24">
      {/* Premium Background Lighting */}
      <div className="absolute inset-0 bg-[#09090b]" />
      <div
        className="absolute top-12 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[160px] opacity-25 pointer-events-none"
        style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 80%)" }}
      />
      {/* Ultra Fine Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative max-w-5xl mx-auto px-6 text-center z-10">
        {/* Sleek Pill Badge */}
        <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800/80 rounded-full px-4 py-1.5 mb-8">
          <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase">
            AI-powered affiliate revenue protection
          </span>
        </div>

        {/* Elegant Premium Title */}
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.05] text-gradient-premium max-w-4xl mx-auto">
          Stop losing commissions <br /> to dead links.
        </h1>

        <p className="text-base md:text-lg text-zinc-400 max-w-2xl mx-auto mb-12 leading-relaxed">
          One broken Amazon affiliate link costs creators thousands in lost revenue. ExpireLinkX monitors your website and YouTube descriptions in real time, automatically suggesting replacements.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-20">
          <a
            href="https://chromewebstore.google.com"
            target="_blank"
            className="inline-flex items-center gap-2 bg-white text-zinc-950 font-semibold px-8 py-4 rounded-xl text-sm hover:bg-zinc-200 transition-all hover:-translate-y-0.5 shadow-lg shadow-white/5"
          >
            Install Free Extension
            {Icons.arrowRight()}
          </a>
          <a
            href="#demo"
            className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 text-zinc-300 font-semibold px-8 py-4 rounded-xl text-sm hover:bg-zinc-800 transition-all"
          >
            {Icons.play()}
            Watch Demo
          </a>
        </div>

        {/* Dashboard Mockup wireframe (Professional Premium UI) */}
        <div className="relative mx-auto max-w-4xl rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-3 shadow-2xl shadow-indigo-500/5 backdrop-blur-sm animate-slideUp">
          <div className="flex items-center gap-2 px-3 pb-3 border-b border-zinc-900">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
            <div className="ml-4 text-[10px] text-zinc-600 bg-zinc-900/50 rounded px-6 py-0.5 font-mono">dashboard.expirelinkx.com</div>
          </div>
          <div className="grid grid-cols-12 gap-4 p-4 text-left">
            <div className="col-span-3 border-r border-zinc-900/80 pr-4 space-y-2.5 hidden md:block">
              <div className="h-3 w-16 bg-zinc-800/60 rounded" />
              <div className="h-7 bg-indigo-950/20 border border-indigo-900/30 rounded-lg" />
              <div className="h-7 bg-zinc-900/30 rounded-lg" />
              <div className="h-7 bg-zinc-900/30 rounded-lg" />
            </div>
            <div className="col-span-12 md:col-span-9 space-y-4">
              <div className="flex justify-between items-center">
                <div className="h-4 w-32 bg-zinc-800 rounded" />
                <div className="h-6 w-20 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded flex items-center justify-center">Active Scan</div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-zinc-900/40 border border-zinc-900 p-3 rounded-xl space-y-1">
                  <div className="text-[10px] text-zinc-500 font-medium">LINKS MONITORED</div>
                  <div className="text-lg font-bold font-nums text-white">4,281</div>
                </div>
                <div className="bg-zinc-900/40 border border-zinc-900 p-3 rounded-xl space-y-1">
                  <div className="text-[10px] text-zinc-500 font-medium">DEAD DETECTED</div>
                  <div className="text-lg font-bold font-nums text-rose-400">12</div>
                </div>
                <div className="bg-zinc-900/40 border border-zinc-900 p-3 rounded-xl space-y-1">
                  <div className="text-[10px] text-zinc-500 font-medium">REVENUE SAVED</div>
                  <div className="text-lg font-bold font-nums text-white">₹8,450</div>
                </div>
              </div>
              <div className="border border-zinc-900 rounded-xl overflow-hidden text-xs">
                <div className="bg-zinc-900/20 p-2.5 border-b border-zinc-900 flex justify-between text-zinc-500 font-medium">
                  <span>Target Page URL</span>
                  <span>Status</span>
                </div>
                <div className="p-3 flex justify-between items-center border-b border-zinc-900/50 bg-zinc-950/20">
                  <span className="text-zinc-400 font-mono">.../best-mirrorless-cameras-2026</span>
                  <span className="text-rose-400 bg-rose-500/5 border border-rose-500/10 px-2 py-0.5 rounded text-[10px] font-bold">2 Out-of-Stock</span>
                </div>
                <div className="p-3 flex justify-between items-center bg-zinc-950/10">
                  <span className="text-zinc-400 font-mono">.../top-vlogging-gears</span>
                  <span className="text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded text-[10px] font-bold">Healthy</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PainSection() {
  const pains = [
    {
      icon: Icons.alert(),
      title: "Silent Out-of-Stock Statuses",
      desc: "Standard link checkers only look for 404 errors. They miss Amazon's 'Currently Unavailable' pages because the server returns a 200 OK status.",
    },
    {
      icon: Icons.youtube(),
      title: "Legacy Video Rot",
      desc: "A viral video from two years ago still gains search traffic, but the affiliate links inside its description are broken. Checking 400+ videos manually is impossible.",
    },
    {
      icon: Icons.link(),
      title: "Delayed Detection Loss",
      desc: "The average time to notice a dead affiliate link is three weeks. By then, you have lost thousands of potential conversions.",
    },
    {
      icon: Icons.sparkles(),
      title: "Clunky Enterprise SEO Tools",
      desc: "Most alternative solutions cost $100+/month and are built for massive SEO agencies rather than creators and affiliate publishers.",
    },
  ];

  return (
    <section id="features" className="py-28 bg-[#09090b]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 text-white">
            The silent revenue killer.
          </h2>
          <p className="text-zinc-400 max-w-xl mx-auto text-sm md:text-base">
            Affiliate marketers lose up to 15% of their commissions to broken or discontinued product links. We solve this without the agency price tag.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {pains.map((p, idx) => (
            <div
              key={idx}
              className="bg-[#0c0c0e] border border-zinc-800/80 rounded-2xl p-6.5 hover:border-zinc-700/80 transition-colors flex gap-4"
            >
              <div className="text-indigo-400 shrink-0 mt-0.5">{p.icon}</div>
              <div>
                <h3 className="font-bold text-sm mb-2 text-white">
                  {p.title}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    {
      icon: Icons.shield(),
      title: "Out-of-Stock Engine",
      desc: "We parse page content directly, flagging links that redirect to discontinued or out-of-stock product listings.",
      tag: "AI-Powered",
    },
    {
      icon: Icons.youtube(),
      title: "YouTube Channel Monitor",
      desc: "Connect your channel handle to automatically parse video descriptions. Results are weighted by recent view counts.",
      tag: "Pro",
    },
    {
      icon: Icons.sparkles(),
      title: "AI Suggestion Matches",
      desc: "We analyze the broken target page and recommend equivalent active merchant links for rapid replacement.",
      tag: "AI-Powered",
    },
    {
      icon: Icons.link(),
      title: "Extension Overlays",
      desc: "Overlay indicators highlight broken and warning links natively as you browse your own web pages.",
      tag: "Extension",
    },
    {
      icon: Icons.alert(),
      title: "Automated Alerts",
      desc: "Receive weekly summaries or real-time alerts via Email and WhatsApp as soon as monitored links degrade.",
      tag: "Pro",
    },
    {
      icon: Icons.arrowRight(),
      title: "Fast Parallel Parsing",
      desc: "Check dozens of URLs concurrently. Get full page validation and redirects paths within seconds.",
      tag: "Engine",
    },
  ];

  const tagColors: Record<string, string> = {
    "AI-Powered": "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    Pro: "bg-zinc-800 text-zinc-400 border-zinc-700/50",
    Extension: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    Engine: "bg-zinc-800 text-zinc-400 border-zinc-700/50",
  };

  return (
    <section className="py-28 bg-[#0c0c0e] border-y border-zinc-900">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 text-white">
            Built for modern publishers.
          </h2>
          <p className="text-zinc-400 max-w-xl mx-auto text-sm">
            Everything you need to monitor, detect, and fix link issues automatically.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {features.map((f, idx) => (
            <div
              key={idx}
              className="bg-[#09090b] border border-zinc-800/85 rounded-2xl p-6.5 hover:border-indigo-500/30 transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <span className="text-indigo-400">{f.icon}</span>
                <span
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-md border",
                    tagColors[f.tag] || ""
                  )}
                >
                  {f.tag}
                </span>
              </div>
              <h3 className="font-bold text-sm mb-2 text-white group-hover:text-indigo-400 transition-colors">
                {f.title}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection({ plans }: { plans: Plan[] }) {
  return (
    <div className="max-w-5xl mx-auto px-6">
      <div className="grid md:grid-cols-3 gap-6 items-stretch">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={cn(
              "relative rounded-2xl p-6.5 border flex flex-col justify-between transition-all duration-300",
              plan.popular
                ? "bg-[#0c0c0e] border-indigo-500/50 shadow-lg shadow-indigo-500/5 scale-[1.02]"
                : "bg-[#0c0c0e] border-zinc-850 hover:border-zinc-700/80"
            )}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Most Popular
              </div>
            )}
            <div>
              <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">{plan.name}</div>
              <div className="flex items-baseline gap-1 mb-1 mt-3">
                <span className="text-4xl font-extrabold text-white">
                  ₹{plan.price_inr}
                </span>
                <span className="text-zinc-500 text-xs font-medium">/month</span>
              </div>
              <div className="text-zinc-500 text-[11px] mb-6">${plan.price_usd} USD</div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-xs text-zinc-400">
                    <span className="mt-0.5 shrink-0">{Icons.check()}</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <a
              href={plan.id === "agency" ? "/contact" : `/checkout?plan=${plan.id}`}
              className={cn(
                "block text-center font-bold py-3 rounded-xl text-xs transition-all",
                plan.popular
                  ? "bg-indigo-600 text-white hover:bg-indigo-500"
                  : "bg-zinc-900 text-zinc-200 hover:bg-zinc-800 border border-zinc-800"
              )}
            >
              {plan.cta}
            </a>
          </div>
        ))}
      </div>
      <div className="text-center mt-10 text-xs text-zinc-500">
        All memberships include a risk-free 7-day trial · Cancel or upgrade at any time
      </div>
    </div>
  );
}

function FAQ() {
  const faqs = [
    {
      q: "Does the extension impact browser speeds?",
      a: "No. ExpireLinkX only checks page structures on-demand when you request a scan. No persistent scripts run in the background on other tabs.",
    },
    {
      q: "How does out-of-stock monitoring verify Amazon listings?",
      a: "Unlike typical checkers that see a '200 OK' response from Amazon, we parse product page properties and contents to identify unavailable products.",
    },
    {
      q: "What is required to scan a YouTube channel?",
      a: "Simply input your public channel handle (@YourChannel). We utilize public YouTube feeds to audit your list of links without requiring credentials.",
    },
    {
      q: "Is scanned page content kept private?",
      a: "We only parse hyperlinks embedded within the pages you request to audit. We never index private metadata, login parameters, or user data.",
    },
  ];

  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="py-28 bg-[#09090b]">
      <div className="max-w-3xl mx-auto px-6">
        <h2 className="text-3xl font-extrabold tracking-tight text-center mb-16 text-white">
          Frequently asked questions
        </h2>
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <div
              key={i}
              className="bg-[#0c0c0e] border border-zinc-800/80 rounded-xl overflow-hidden transition-all duration-200"
            >
              <button
                className="w-full text-left px-6 py-4.5 flex items-center justify-between gap-4 font-semibold text-sm text-white"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span>{f.q}</span>
                <span className={cn("text-zinc-500 transition-transform duration-200 text-lg", open === i ? "rotate-45" : "")}>+</span>
              </button>
              {open === i && (
                <div className="px-6 pb-5 text-xs text-zinc-400 leading-relaxed border-t border-zinc-900/50 pt-3 animate-fadeIn">
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-24 bg-[#09090b] border-t border-zinc-900">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <div className="relative bg-zinc-950/50 border border-zinc-800/80 rounded-3xl p-12 overflow-hidden">
          <div
            className="absolute -top-24 -left-24 w-80 h-80 rounded-full blur-[120px] opacity-15 pointer-events-none"
            style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 80%)" }}
          />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 text-white">
              Audit your link health.
            </h2>
            <p className="text-zinc-400 mb-8 max-w-md mx-auto text-xs md:text-sm">
              Get started with 3 free scans daily. Install our extension in seconds, no configuration or signup required.
            </p>
            <a
              href="https://chromewebstore.google.com"
              target="_blank"
              className="inline-flex items-center gap-2 bg-white text-zinc-950 font-semibold px-8 py-4.5 rounded-xl text-xs hover:bg-zinc-200 transition-all hover:-translate-y-0.5 shadow-md shadow-white/5"
            >
              Add Extension to Chrome
              {Icons.arrowRight()}
            </a>
            <div className="mt-4 text-[10px] text-zinc-500">
              No credit card required. Start scanning immediately.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const FALLBACK_PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price_inr: 499,
    price_usd: 6,
    features: ["50 link scans/day", "Chrome extension access", "Basic broken link detection", "Email alerts", "1 website monitored"],
    cta: "Start Free Trial",
  },
  {
    id: "pro",
    name: "Pro",
    price_inr: 999,
    price_usd: 12,
    features: ["Unlimited scans", "YouTube channel scanner", "AI replacement suggestions", "Amazon out-of-stock detection", "Weekly auto-monitoring", "5 sites + 3 channels"],
    cta: "Get Pro",
    popular: true,
  },
  {
    id: "agency",
    name: "Agency",
    price_inr: 2999,
    price_usd: 36,
    features: ["Everything in Pro", "Unlimited sites & channels", "White-label reports", "5 team seats", "Priority API access"],
    cta: "Contact Sales",
  },
];

function PlansLoader() {
  const [plans, setPlans] = useState<Plan[]>(FALLBACK_PLANS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    fetch(`${apiUrl}/api/plans`)
      .then((r) => r.json())
      .then((d) => {
        if (d.plans) {
          setPlans(d.plans);
        }
      })
      .catch((err) => log.warn("Fallback pricing loaded:", err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto px-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl p-6.5 border border-zinc-800 bg-[#0c0c0e] animate-pulse flex flex-col justify-between">
            <div className="space-y-4">
              <div className="h-4 w-16 bg-zinc-800 rounded" />
              <div className="h-8 w-24 bg-zinc-800 rounded" />
              <div className="space-y-2 pt-4">
                {[1, 2, 3, 4].map((j) => (<div key={j} className="h-3 bg-zinc-800 rounded w-full" />))}
              </div>
            </div>
            <div className="h-10 bg-zinc-850 rounded-xl mt-8" />
          </div>
        ))}
      </div>
    );
  }

  return <PricingSection plans={plans} />;
}

export default function Home() {
  return (
    <main className="bg-[#09090b] text-zinc-100 min-h-screen">
      <NavBar />
      <Hero />
      <PainSection />
      <FeaturesSection />
      <section id="pricing" className="py-28 bg-[#09090b]">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 text-white">
            Simple, honest pricing.
          </h2>
          <p className="text-zinc-400 text-sm">Find one broken high-commission link, and it pays for itself.</p>
        </div>
        <PlansLoader />
      </section>
      <FAQ />
      <CTA />
      <footer className="border-t border-zinc-900 py-10 text-center text-xs text-zinc-650 bg-[#09090b]">
        © 2026 ExpireLinkX. Protecting affiliate publishers and creators.
      </footer>
    </main>
  );
}
