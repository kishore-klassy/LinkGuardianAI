"use client";
import { useState, useEffect, Suspense } from "react";
import { ThemeToggle } from "@/lib/components/ThemeToggle";
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

// ─── Icons ────────────────────────────────────────────────────────────────────
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
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  ),
  close: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  menu: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  ),
  zap: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  ),
  star: () => (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  ),
};

// ─── NavBar ───────────────────────────────────────────────────────────────────
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
        "fixed top-0 w-full z-50 transition-all duration-400",
        scrolled
          ? "glass-nav border-b shadow-md"
          : "bg-transparent border-b border-transparent"
      )}
      style={{ borderColor: scrolled ? "var(--border-color)" : "transparent" }}
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2.5 group">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-lg transition-transform duration-300 group-hover:scale-105"
            style={{ background: "var(--accent-gradient)", boxShadow: "0 4px 16px rgba(108,71,255,0.35)" }}
          >
            {Icons.shield()}
          </div>
          <span className="font-extrabold text-lg tracking-tight" style={{ color: "var(--text-primary)" }}>
            LinkGuardian<span style={{ color: "var(--accent)" }}>.AI</span>
          </span>
        </a>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
          <a href="#features" className="hover:text-[var(--accent)] transition-colors duration-200">Features</a>
          <a href="#pricing" className="hover:text-[var(--accent)] transition-colors duration-200">Pricing</a>
          <a href="#faq" className="hover:text-[var(--accent)] transition-colors duration-200">FAQ</a>
        </div>

        {/* CTA */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <a
            href="/dashboard"
            className="btn-primary text-xs hidden sm:inline-flex"
          >
            Go to Scanner
            {Icons.arrowRight()}
          </a>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
            style={{ color: "var(--text-secondary)" }}
          >
            {mobileOpen ? Icons.close() : Icons.menu()}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div
          className="md:hidden border-b px-6 py-5 space-y-3 animate-fadeIn glass-nav"
          style={{ borderColor: "var(--border-color)" }}
        >
          {["#features", "#pricing", "#faq"].map((href) => (
            <a
              key={href}
              href={href}
              className="block text-sm font-medium py-2 transition-colors hover:text-[var(--accent)]"
              style={{ color: "var(--text-secondary)" }}
              onClick={() => setMobileOpen(false)}
            >
              {href.slice(1).charAt(0).toUpperCase() + href.slice(2)}
            </a>
          ))}
          <a
            href="https://chromewebstore.google.com"
            target="_blank"
            className="btn-primary w-full text-center block mt-2"
          >
            Add to Chrome
          </a>
        </div>
      )}
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-28 pb-20">
      {/* Background */}
      <div className="absolute inset-0" style={{ background: "var(--bg-primary)" }} />
      {/* Hero gradient */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "var(--gradient-hero)" }} />
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(var(--accent) 1px, transparent 1px), linear-gradient(90deg, var(--accent) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      {/* Floating orbs */}
      <div
        className="absolute top-24 right-1/4 w-72 h-72 rounded-full pointer-events-none animate-float"
        style={{ background: "radial-gradient(circle, rgba(108,71,255,0.12) 0%, transparent 70%)", filter: "blur(40px)" }}
      />
      <div
        className="absolute bottom-32 left-1/4 w-56 h-56 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(156,111,255,0.10) 0%, transparent 70%)", filter: "blur(32px)" }}
      />

      <div className="relative max-w-5xl mx-auto px-6 text-center z-10">
        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8 animate-fadeIn"
          style={{
            background: "var(--accent-light)",
            border: "1px solid var(--border-card)",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: "var(--accent)" }} />
          <span className="text-[11px] font-bold tracking-wider uppercase" style={{ color: "var(--accent)" }}>
            AI-powered affiliate revenue protection
          </span>
        </div>

        {/* Headline */}
        <h1
          className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.05] max-w-4xl mx-auto animate-slideUp"
        >
          <span className="dark:text-gradient-premium text-gradient-premium-light">Stop losing commissions</span>
          <br />
          <span className="text-gradient-vivid">to dead links.</span>
        </h1>

        <p
          className="text-base md:text-lg max-w-2xl mx-auto mb-10 leading-relaxed animate-slideUp animate-delay-100"
          style={{ color: "var(--text-secondary)" }}
        >
          One broken Amazon affiliate link costs creators thousands in lost revenue.{" "}
          <strong className="font-semibold" style={{ color: "var(--text-primary)" }}>LinkGuardian.AI</strong> monitors your
          website and YouTube descriptions in real time, automatically suggesting replacements.
        </p>

        {/* Social proof */}
        <div className="flex items-center justify-center gap-1 mb-10 animate-fadeIn animate-delay-200">
          {[...Array(5)].map((_, i) => (
            <span key={i} style={{ color: "#F59E0B" }}>{Icons.star()}</span>
          ))}
          <span className="ml-2 text-xs font-semibold" style={{ color: "var(--text-tertiary)" }}>Trusted by 1,200+ creators</span>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 animate-slideUp animate-delay-200">
          <a href="/dashboard" className="btn-primary shadow-lg shadow-indigo-500/25 px-8 py-4 text-sm w-full sm:w-auto justify-center">
            Go to Scanner
            {Icons.arrowRight()}
          </a>
        </div>

        {/* Dashboard Mockup */}
        <div
          className="relative mx-auto max-w-4xl rounded-2xl p-3 animate-slideUp animate-delay-300"
          style={{
            background: "var(--bg-card-glass)",
            backdropFilter: "blur(20px)",
            border: "1px solid var(--border-card)",
            boxShadow: "var(--shadow-xl)",
          }}
        >
          {/* Browser chrome */}
          <div className="flex items-center gap-2 px-3 pb-3 border-b" style={{ borderColor: "var(--border-color)" }}>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/60" />
            <div
              className="ml-3 text-[10px] font-mono px-6 py-0.5 rounded"
              style={{ background: "var(--bg-hover)", color: "var(--text-tertiary)" }}
            >
              dashboard.linkguardian.ai
            </div>
          </div>

          {/* Mockup content */}
          <div className="grid grid-cols-12 gap-4 p-4 text-left">
            {/* Sidebar */}
            <div className="col-span-3 border-r pr-4 space-y-2 hidden md:block" style={{ borderColor: "var(--border-color)" }}>
              <div className="h-3 w-20 rounded skeleton mb-3" />
              <div
                className="h-8 rounded-xl"
                style={{ background: "var(--accent-light)", border: "1px solid var(--border-card)" }}
              />
              <div className="h-8 rounded-xl skeleton" />
              <div className="h-8 rounded-xl skeleton" />
              <div className="h-8 rounded-xl skeleton" />
            </div>

            {/* Main content */}
            <div className="col-span-12 md:col-span-9 space-y-4">
              {/* KPI row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "LINKS MONITORED", value: "4,281", color: "var(--accent)" },
                  { label: "DEAD DETECTED", value: "12", color: "var(--accent-red)" },
                  { label: "REVENUE SAVED", value: "₹8,450", color: "var(--accent-green)" },
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    className="rounded-xl p-3 space-y-1"
                    style={{ background: "var(--bg-hover)", border: "1px solid var(--border-card)" }}
                  >
                    <div className="text-[9px] font-bold tracking-widest uppercase" style={{ color: "var(--text-tertiary)" }}>{kpi.label}</div>
                    <div className="text-base font-bold font-nums" style={{ color: kpi.color }}>{kpi.value}</div>
                  </div>
                ))}
              </div>

              {/* Link table */}
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-color)" }}>
                <div
                  className="flex justify-between text-[9px] font-bold uppercase tracking-widest px-3 py-2 border-b"
                  style={{ background: "var(--bg-tertiary)", borderColor: "var(--border-color)", color: "var(--text-tertiary)" }}
                >
                  <span>Target URL</span><span>Status</span>
                </div>
                {[
                  { url: ".../best-mirrorless-cameras-2026", status: "Out-of-Stock", color: "var(--accent-orange)", bg: "var(--accent-orange-bg)" },
                  { url: ".../top-vlogging-gears", status: "Healthy", color: "var(--accent-green)", bg: "var(--accent-green-bg)" },
                  { url: ".../budget-laptops-india", status: "Broken", color: "var(--accent-red)", bg: "var(--accent-red-bg)" },
                ].map((row, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center px-3 py-2.5 text-[10px] border-b last:border-b-0"
                    style={{ borderColor: "var(--border-color)" }}
                  >
                    <span className="font-mono" style={{ color: "var(--text-secondary)" }}>{row.url}</span>
                    <span
                      className="px-2 py-0.5 rounded text-[9px] font-bold"
                      style={{ color: row.color, background: row.bg, border: `1px solid ${row.color}25` }}
                    >
                      {row.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Pain Section ─────────────────────────────────────────────────────────────
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
    <section id="features" className="py-28" style={{ background: "var(--bg-primary)" }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-4 text-[11px] font-bold tracking-widest uppercase"
            style={{ background: "var(--accent-light)", color: "var(--accent)", border: "1px solid var(--border-card)" }}
          >
            The Problem
          </div>
          <h2
            className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            The silent revenue killer.
          </h2>
          <p className="max-w-xl mx-auto text-sm md:text-base" style={{ color: "var(--text-secondary)" }}>
            Affiliate marketers lose up to 15% of their commissions to broken or discontinued product links.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5 max-w-4xl mx-auto">
          {pains.map((p, idx) => (
            <div
              key={idx}
              className="glass-card rounded-2xl p-6 flex gap-4"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: "var(--accent-light)", color: "var(--accent)" }}
              >
                {p.icon}
              </div>
              <div>
                <h3 className="font-bold text-sm mb-2" style={{ color: "var(--text-primary)" }}>
                  {p.title}
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Features Section ─────────────────────────────────────────────────────────
function FeaturesSection() {
  const features = [
    { icon: Icons.shield(), title: "Out-of-Stock Engine", desc: "We parse page content directly, flagging links that redirect to discontinued or out-of-stock product listings.", tag: "AI-Powered" },
    { icon: Icons.youtube(), title: "YouTube Channel Monitor", desc: "Connect your channel handle to automatically parse video descriptions. Results are weighted by recent view counts.", tag: "Pro" },
    { icon: Icons.youtube(), title: "YouTube Channel Scan", desc: "Scan YouTube video descriptions across your entire channel for dead affiliate links instantly.", tag: "YouTube" },
    { icon: Icons.link(), title: "Automated Rescanning", desc: "Schedule continuous background monitoring of your most important pages to never miss a broken link.", tag: "Automation" },
    { icon: Icons.alert(), title: "Automated Alerts", desc: "Receive weekly summaries or real-time alerts via Email and WhatsApp as soon as monitored links degrade.", tag: "Pro" },
    { icon: Icons.zap(), title: "Fast Parallel Parsing", desc: "Check dozens of URLs concurrently. Get full page validation and redirect paths within seconds.", tag: "Engine" },
  ];

  const tagColors: Record<string, { bg: string; text: string; border: string }> = {
    "AI-Powered": { bg: "var(--accent-purple-bg)", text: "var(--accent-purple)", border: "rgba(139,92,246,0.25)" },
    Pro: { bg: "var(--accent-blue-bg)", text: "var(--accent-blue)", border: "rgba(59,130,246,0.25)" },
    YouTube: { bg: "var(--accent-red-bg)", text: "var(--accent-red)", border: "rgba(239,68,68,0.25)" },
    Automation: { bg: "var(--accent-green-bg)", text: "var(--accent-green)", border: "rgba(16,185,129,0.25)" },
    Engine: { bg: "var(--bg-hover)", text: "var(--text-secondary)", border: "var(--border-color)" },
  };

  return (
    <section
      className="py-28 border-y"
      style={{ background: "var(--bg-secondary)", borderColor: "var(--border-color)" }}
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-4 text-[11px] font-bold tracking-widest uppercase"
            style={{ background: "var(--accent-light)", color: "var(--accent)", border: "1px solid var(--border-card)" }}
          >
            Features
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4" style={{ color: "var(--text-primary)" }}>
            Built for modern publishers.
          </h2>
          <p className="max-w-xl mx-auto text-sm" style={{ color: "var(--text-secondary)" }}>
            Everything you need to monitor, detect, and fix link issues automatically.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {features.map((f, idx) => (
            <div
              key={idx}
              className="glass-card rounded-2xl p-6 group cursor-default"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                  style={{ background: "var(--accent-light)", color: "var(--accent)" }}
                >
                  {f.icon}
                </div>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-lg border"
                  style={{
                    background: tagColors[f.tag]?.bg,
                    color: tagColors[f.tag]?.text,
                    borderColor: tagColors[f.tag]?.border,
                  }}
                >
                  {f.tag}
                </span>
              </div>
              <h3
                className="font-bold text-sm mb-2 transition-colors duration-200 group-hover:text-[var(--accent)]"
                style={{ color: "var(--text-primary)" }}
              >
                {f.title}
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Pricing Section ──────────────────────────────────────────────────────────
function PricingSection({ plans }: { plans: Plan[] }) {
  return (
    <div className="max-w-5xl mx-auto px-6">
      <div className="grid md:grid-cols-3 gap-6 items-stretch">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={cn(
              "relative rounded-2xl p-6 flex flex-col justify-between transition-all duration-300",
              plan.popular
                ? "scale-[1.02]"
                : ""
            )}
            style={{
              background: plan.popular ? "var(--bg-card-glass)" : "var(--bg-card)",
              backdropFilter: plan.popular ? "blur(16px)" : "none",
              border: plan.popular ? "1.5px solid var(--border-strong)" : "1.5px solid var(--border-card)",
              boxShadow: plan.popular ? "var(--shadow-lg)" : "var(--shadow-card)",
            }}
          >
            {plan.popular && (
              <div
                className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider"
                style={{ background: "var(--accent-gradient)", boxShadow: "0 4px 16px rgba(108,71,255,0.40)" }}
              >
                Most Popular
              </div>
            )}
            <div>
              <div
                className="text-[11px] font-bold uppercase tracking-widest mb-1"
                style={{ color: "var(--text-tertiary)" }}
              >
                {plan.name}
              </div>
              <div className="flex items-baseline gap-1 mt-3 mb-1">
                <span className="text-4xl font-extrabold" style={{ color: "var(--text-primary)" }}>
                  ₹{plan.price_inr}
                </span>
                <span className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>/month</span>
              </div>
              <div className="text-[11px] mb-6" style={{ color: "var(--text-tertiary)" }}>${plan.price_usd} USD</div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                    <span className="mt-0.5 shrink-0" style={{ color: "var(--accent)" }}>{Icons.check()}</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <a href="/dashboard" className="block text-center py-4 rounded-xl mt-4 font-bold" style={{ background: "var(--accent-gradient)", color: "#fff" }}>
                Go to Scanner
              </a>
          </div>
        ))}
      </div>
      <div className="text-center mt-10 text-xs" style={{ color: "var(--text-tertiary)" }}>
        All memberships include a risk-free 7-day trial · Cancel or upgrade at any time
      </div>
    </div>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
function FAQ() {
  const faqs = [
    {
      q: "Does the extension impact browser speeds?",
      a: "No. LinkGuardian.AI only checks page structures on-demand when you request a scan. No persistent scripts run in the background on other tabs.",
    },
    {
      q: "How does out-of-stock monitoring verify Amazon listings?",
      a: "Unlike typical checkers that see a '200 OK' response from Amazon, we parse product page properties and contents to identify unavailable products.",
    },
    {
      q: "What is required to scan a YouTube channel?",
      a: "Simply input your public channel handle (@YourChannel). You can choose how many recent videos to scan — Pro users can scan up to 200 videos per request.",
    },
    {
      q: "Is scanned page content kept private?",
      a: "We only parse hyperlinks embedded within the pages you request to audit. We never index private metadata, login parameters, or user data.",
    },
    {
      q: "What is the difference between the plans?",
      a: "Free users get 5 YouTube videos per scan. Starter gets 20 videos. Pro & Agency unlock up to 200 videos, unlimited sites, and AI replacement suggestions.",
    },
  ];

  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="py-28" style={{ background: "var(--bg-primary)" }}>
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-extrabold tracking-tight mb-3" style={{ color: "var(--text-primary)" }}>
            Frequently asked questions
          </h2>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Everything you need to know about LinkGuardian.AI</p>
        </div>
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <div
              key={i}
              className="rounded-2xl overflow-hidden transition-all duration-200"
              style={{
                background: "var(--bg-card)",
                border: open === i ? "1.5px solid var(--border-strong)" : "1.5px solid var(--border-card)",
                boxShadow: open === i ? "var(--shadow-md)" : "var(--shadow-card)",
              }}
            >
              <button
                className="w-full text-left px-6 py-4 flex items-center justify-between gap-4 font-semibold text-sm"
                onClick={() => setOpen(open === i ? null : i)}
                style={{ color: "var(--text-primary)" }}
              >
                <span>{f.q}</span>
                <span
                  className={cn("transition-transform duration-200 text-xl shrink-0 font-light")}
                  style={{ color: "var(--accent)", transform: open === i ? "rotate(45deg)" : "rotate(0)" }}
                >
                  +
                </span>
              </button>
              {open === i && (
                <div
                  className="px-6 pb-5 text-xs leading-relaxed border-t pt-3 animate-fadeIn"
                  style={{ color: "var(--text-secondary)", borderColor: "var(--border-color)" }}
                >
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

// ─── CTA ──────────────────────────────────────────────────────────────────────
function CTA() {
  return (
    <section
      className="py-24 border-t"
      style={{ background: "var(--bg-secondary)", borderColor: "var(--border-color)" }}
    >
      <div className="max-w-4xl mx-auto px-6 text-center">
        <div
          className="relative rounded-3xl p-12 md:p-16 overflow-hidden"
          style={{
            background: "var(--bg-card-glass)",
            backdropFilter: "blur(20px)",
            border: "1.5px solid var(--border-card)",
            boxShadow: "var(--shadow-xl)",
          }}
        >
          {/* Glow orbs */}
          <div
            className="absolute -top-20 -right-20 w-64 h-64 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(108,71,255,0.15) 0%, transparent 70%)", filter: "blur(40px)" }}
          />
          <div
            className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(156,111,255,0.12) 0%, transparent 70%)", filter: "blur(30px)" }}
          />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4" style={{ color: "var(--text-primary)" }}>
              Audit your link health.
            </h2>
            <p className="mb-8 max-w-md mx-auto text-sm" style={{ color: "var(--text-secondary)" }}>
              Get started with 3 free scans daily. Go to the scanner in seconds — no configuration or signup required.
            </p>
            <a
              href="/dashboard"
              className="btn-primary px-8 py-4 text-sm inline-flex shadow-xl shadow-indigo-500/20"
            >
              Go to Scanner
              {Icons.arrowRight()}
            </a>
            <div className="mt-4 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              No credit card required. Start scanning immediately.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Plans Loader ─────────────────────────────────────────────────────────────
const FALLBACK_PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price_inr: 499,
    price_usd: 6,
    features: ["50 link scans/day", "Automated monitoring", "Basic broken link detection", "Email alerts", "1 website monitored", "Scan up to 50 YouTube videos"],
    cta: "Start Free Trial",
  },
  {
    id: "pro",
    name: "Pro",
    price_inr: 999,
    price_usd: 12,
    features: ["Unlimited scans", "YouTube channel scanner (200 videos)", "AI replacement suggestions", "Amazon out-of-stock detection", "Weekly auto-monitoring", "5 sites + 3 channels", "WhatsApp/Email alerts"],
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
      .then((d) => { if (d.plans) setPlans(d.plans); })
      .catch((err) => log.warn("Fallback pricing loaded:", err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto px-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl p-6 flex flex-col justify-between"
            style={{ background: "var(--bg-card)", border: "1.5px solid var(--border-card)" }}
          >
            <div className="space-y-4">
              <div className="h-4 w-16 skeleton" />
              <div className="h-8 w-24 skeleton" />
              <div className="space-y-2 pt-4">
                {[1, 2, 3, 4].map((j) => <div key={j} className="h-3 skeleton w-full" />)}
              </div>
            </div>
            <div className="h-10 skeleton rounded-xl mt-8" />
          </div>
        ))}
      </div>
    );
  }

  return <PricingSection plans={plans} />;
}

// ─── Home Page ────────────────────────────────────────────────────────────────
export default function Home() {
  return (
    <main style={{ background: "var(--bg-primary)", color: "var(--text-primary)", minHeight: "100vh" }}>
      <NavBar />
      <Hero />
      <PainSection />
      <FeaturesSection />
      <section id="pricing" className="py-28" style={{ background: "var(--bg-primary)" }}>
        <div className="text-center mb-14">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-4 text-[11px] font-bold tracking-widest uppercase"
            style={{ background: "var(--accent-light)", color: "var(--accent)", border: "1px solid var(--border-card)" }}
          >
            Pricing
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-3" style={{ color: "var(--text-primary)" }}>
            Simple, honest pricing.
          </h2>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Find one broken high-commission link, and it pays for itself.
          </p>
        </div>
        <PlansLoader />
      </section>
      <FAQ />
      <CTA />
      <footer
        className="border-t py-10 text-center text-xs"
        style={{ background: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-tertiary)" }}
      >
        © 2026 LinkGuardian.AI — Protecting affiliate publishers and creators worldwide.
      </footer>
    </main>
  );
}
