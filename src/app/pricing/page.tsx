"use client";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

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
    cta: "Get Pro",
    popular: true,
  },
];

const CheckIcon = () => (
  <svg className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

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
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col justify-between">
      <div className="max-w-5xl mx-auto px-6 py-24 w-full">
        <div className="text-center mb-16">
          <a href="/" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 mb-8 transition-colors font-semibold">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Back to Home
          </a>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 text-white">
            Simple, honest pricing
          </h1>
          <p className="text-zinc-400 text-sm max-w-md mx-auto">
            Find one dead affiliate link and our plans pay for themselves. Get started today.
          </p>

          <div className="inline-flex items-center gap-1 bg-zinc-950 border border-zinc-850 rounded-full p-1 mt-8">
            <button
              onClick={() => setAnnual(false)}
              className={cn("px-4.5 py-1.5 rounded-full text-xs font-bold transition-all", !annual ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-300")}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={cn("px-4.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5", annual ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-300")}
            >
              Annual 
              <span className="text-[10px] bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 px-1.5 py-0.2 rounded font-semibold">Save 20%</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan) => {
            const price = annual ? Math.round(plan.price_inr * 12 * 0.8) : plan.price_inr;
            return (
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
                      ₹{annual ? price : plan.price_inr}
                    </span>
                    <span className="text-zinc-500 text-xs font-medium">/{annual ? "year" : "month"}</span>
                  </div>
                  <div className="text-zinc-500 text-[11px] mb-6">${plan.price_usd} USD</div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-xs text-zinc-400">
                        <CheckIcon />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                <a
                  href={`/checkout?plan=${plan.id}&billing=${annual ? "annual" : "monthly"}`}
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
            );
          })}
        </div>
        <div className="text-center mt-10 text-xs text-zinc-500">
          All memberships include a risk-free 7-day trial · No credit card required to start
        </div>
      </div>
      <footer className="border-t border-zinc-900 py-8 text-center text-xs text-zinc-650 bg-[#09090b]">
        © 2026 LinkGuardian.AI. Protecting affiliate publishers and creators.
      </footer>
    </div>
  );
}
