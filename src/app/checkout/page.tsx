"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSession } from "@/lib/supabase";
import { log } from "@/lib/utils";

const PLAN_DETAILS: Record<string, { name: string; price: number }> = {
  starter: { name: "Starter", price: 499 },
  pro: { name: "Pro", price: 999 },
  agency: { name: "Agency", price: 2999 },
};

function CheckoutInner() {
  const searchParams = useSearchParams();
  const planId = searchParams?.get("plan") || "pro";
  const plan =
    (PLAN_DETAILS[planId as keyof typeof PLAN_DETAILS] ?? PLAN_DETAILS.pro) as {
      name: string;
      price: number;
    };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    log.info(`Checkout page loaded: plan=${planId}`);
    getSession().then((session) => {
      if (session?.user?.email) {
        log.info(`User session found: ${session.user.email}`);
        setUserEmail(session.user.email);
        setEmail(session.user.email);
      } else {
        log.info("No user session — showing email input");
      }
    });
  }, []);

  async function handleSubscribe() {
    log.step(`Starting checkout for plan: ${planId}`);
    setLoading(true);
    setError("");

    const session = await getSession();
    if (!session && !email) {
      log.warn("Checkout blocked: no email provided");
      setError("Please sign in or provide an email to continue.");
      setLoading(false);
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      log.api("POST", `${apiUrl}/api/stripe/create-checkout`);
      const res = await fetch(`${apiUrl}/api/stripe/create-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: planId,
          user_id: session?.user?.id || undefined,
          email: email || userEmail,
        }),
      });
      const data = await res.json();
      if (data.checkout_url) {
        log.success(`Redirecting to Stripe: ${data.checkout_url}`);
        window.location.href = data.checkout_url;
      } else {
        log.error("Stripe checkout failed: no URL returned");
        setError("Could not create checkout session.");
      }
    } catch (err) {
      log.error("Checkout network error:", err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md mx-auto">
        <a
          href="/pricing"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-355 mb-6 transition-colors font-semibold"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to Pricing
        </a>

        <div className="bg-[#0c0c0e] border border-zinc-800 rounded-2xl p-6.5 shadow-xl">
          <div className="text-center mb-8">
            <div className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest mb-1">
              Checkout Details
            </div>
            <h2 className="text-xl font-bold text-white mb-2">{plan.name} Subscription</h2>
            <div className="flex items-baseline justify-center gap-1 mt-2">
              <span className="text-3xl font-extrabold text-white">₹{plan.price}</span>
              <span className="text-zinc-500 text-xs">/month</span>
            </div>
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/15 rounded-xl px-4 py-3 text-xs text-rose-400 mb-5 font-medium">
              {error}
            </div>
          )}

          <div className="mb-6">
            <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Email Address for Invoice
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
          </div>

          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl text-xs disabled:opacity-50 hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/10"
          >
            {loading ? "Redirecting to Stripe…" : `Subscribe Now`}
          </button>

          <p className="text-center text-[10px] text-zinc-550 mt-5 leading-normal">
            Secure checkout processed by Stripe.<br />7-day trial included. Cancel anytime in one-click.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#09090b] text-zinc-500 flex items-center justify-center text-xs">
          Loading Checkout Session…
        </div>
      }
    >
      <CheckoutInner />
    </Suspense>
  );
}
