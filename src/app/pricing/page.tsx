"use client";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/components/ThemeProvider";

interface Plan {
  id: string;
  name: string;
  price_inr: number;
  price_usd: number;
  features: string[];
  cta: string;
  popular?: boolean;
}

const FALLBACK_PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price_inr: 0,
    price_usd: 0,
    features: [
      "50 link scans/day",
      "Manual scanning",
      "Basic broken link detection",
      "No email alerts",
      "Scan up to 50 YouTube videos",
    ],
    cta: "Current Plan",
  },
  {
    id: "basic",
    name: "Basic",
    price_inr: 499,
    price_usd: 6,
    features: [
      "Unlimited link scans",
      "Automated monitoring",
      "Basic broken link detection",
      "Email alerts",
      "1 website monitored",
      "Scan up to 100 YouTube videos",
    ],
    cta: "Start Basic",
  },
  {
    id: "pro",
    name: "Pro",
    price_inr: 999,
    price_usd: 12,
    features: [
      "Everything in Basic",
      "YouTube channel scanner",
      "AI replacement suggestions",
      "Amazon out-of-stock detection",
      "Weekly auto-monitoring",
      "5 websites + 3 YouTube channels",
      "WhatsApp/Email alerts",
    ],
    cta: "Upgrade to Pro",
    popular: true,
  },
];

const Icons = {
  check: () => (
    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--accent-green-bg)] text-[var(--accent-green)] border border-[rgba(16,185,129,0.2)] shrink-0 mt-0.5">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
    </div>
  ),
  back: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  ),
  zap: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
  )
};

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>(FALLBACK_PLANS);
  const [annual, setAnnual] = useState(false);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/plans`)
      .then((r) => r.json())
      .then((d) => { if (d.plans) setPlans(d.plans); })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      {/* Background Animated Orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[800px] h-[500px] bg-[var(--accent)] opacity-[0.15] blur-[120px] rounded-full pointer-events-none mix-blend-screen" />
      
      <div className="max-w-6xl mx-auto px-6 py-20 w-full relative z-10 flex-1 flex flex-col">
        {/* Header */}
        <div className="text-center mb-16 animate-fadeIn">
          <a href="/dashboard" className="inline-flex items-center gap-2 text-xs font-bold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] mb-8 transition-colors bg-[var(--bg-hover)] px-4 py-2 rounded-full border border-[var(--border-color)]">
            <Icons.back />
            Back to Dashboard
          </a>
          
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-5 text-transparent bg-clip-text bg-gradient-to-br from-[var(--text-primary)] to-[var(--text-tertiary)]">
            Simple, honest pricing
          </h1>
          <p className="text-[var(--text-secondary)] text-sm md:text-base max-w-xl mx-auto leading-relaxed">
            Find one dead affiliate link and our plans pay for themselves. Get started today and effortlessly recover lost revenue.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-1.5 bg-[var(--bg-card)] border border-[var(--border-card)] rounded-full p-1.5 mt-10 shadow-lg">
            <button
              onClick={() => setAnnual(false)}
              className={cn("px-6 py-2.5 rounded-full text-xs font-bold transition-all", !annual ? "bg-[var(--accent)] text-white shadow-md" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]")}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={cn("px-6 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-2", annual ? "bg-[var(--accent)] text-white shadow-md" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]")}
            >
              Annual 
              <span className={cn("text-[10px] px-2 py-0.5 rounded-md font-extrabold tracking-wide transition-colors", annual ? "bg-white/20 text-white" : "bg-[var(--accent-green-bg)] text-[var(--accent-green)] border border-[rgba(16,185,129,0.2)]")}>
                SAVE 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-3 gap-8 items-stretch max-w-5xl mx-auto w-full">
          {plans.map((plan, i) => {
            const priceInr = annual ? Math.round(plan.price_inr * 12 * 0.8) : plan.price_inr;
            const priceUsd = annual ? Math.round(plan.price_usd * 12 * 0.8) : plan.price_usd;
            return (
              <div
                key={plan.id}
                className={cn(
                  "relative rounded-[2rem] p-8 flex flex-col justify-between transition-all duration-500 hover:-translate-y-2 group animate-scaleIn",
                  plan.popular
                    ? "bg-[var(--bg-card)] border-2 border-[var(--accent)] shadow-[0_20px_40px_rgba(108,71,255,0.15)] z-10 lg:scale-[1.05]"
                    : "bg-[var(--bg-card-glass)] backdrop-blur-xl border border-[var(--border-card)] shadow-lg hover:border-[var(--text-tertiary)]"
                )}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#FF479B] to-[#FF7054] text-white text-[10px] font-extrabold px-4 py-1.5 rounded-full uppercase tracking-widest shadow-[0_4px_15px_rgba(255,71,155,0.4)] flex items-center gap-1.5">
                    <Icons.zap /> Most Popular
                  </div>
                )}
                
                <div>
                  <div className="text-xs font-extrabold text-[var(--text-tertiary)] uppercase tracking-widest mb-4">{plan.name}</div>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-5xl font-extrabold text-[var(--text-primary)] tracking-tight">
                      ${priceUsd}
                    </span>
                    <span className="text-[var(--text-tertiary)] text-xs font-bold uppercase tracking-wider">/{annual ? "year" : "month"}</span>
                  </div>
                  <div className="text-[var(--text-secondary)] font-bold text-xs mb-8 flex items-center gap-1.5 bg-[var(--bg-hover)] w-max px-2.5 py-1 rounded-md border border-[var(--border-color)]">
                    ~₹{priceInr.toLocaleString()} INR
                  </div>

                  <div className="h-px w-full bg-gradient-to-r from-[var(--border-color)] to-transparent mb-8" />

                  <ul className="space-y-4 mb-10">
                    {plan.features.map((f, idx) => (
                      <li key={idx} className="flex items-center gap-3.5 text-sm font-medium text-[var(--text-secondary)]">
                        <Icons.check />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                <a
                  href={`/checkout?plan=${plan.id}&billing=${annual ? "annual" : "monthly"}`}
                  className={cn(
                    "block text-center font-bold py-4 rounded-xl text-sm transition-all duration-300 relative overflow-hidden group/btn",
                    plan.popular
                      ? "btn-primary shadow-[0_0_20px_rgba(108,71,255,0.4)]"
                      : "btn-secondary"
                  )}
                >
                  {/* Button Shine Effect */}
                  {plan.popular && (
                    <div className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-[200%] transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
                  )}
                  <span className="relative z-10">{plan.cta}</span>
                </a>
              </div>
            );
          })}
        </div>
        
        <div className="text-center mt-16 text-xs font-semibold text-[var(--text-tertiary)] bg-[var(--bg-hover)] w-max mx-auto px-5 py-2.5 rounded-full border border-[var(--border-color)]">
          All memberships include a risk-free 7-day trial · No credit card required to start
        </div>
      </div>
      
      {/* Footer */}
      <footer className="border-t border-[var(--border-color)] py-8 text-center text-xs font-semibold text-[var(--text-tertiary)] bg-[var(--bg-primary)] mt-auto relative z-10">
        © 2026 LinkGuardian.AI. Protecting affiliate publishers and creators.
      </footer>
    </div>
  );
}
