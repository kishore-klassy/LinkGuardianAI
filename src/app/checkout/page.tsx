"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSession } from "@/lib/supabase";
import { log } from "@/lib/utils";

const PLAN_DETAILS: Record<string, { name: string; price: number }> = {
  basic: { name: "Basic", price: 499 },
  pro: { name: "Pro", price: 999 },
};

const loadRazorpay = () => new Promise((resolve) => {
  if (document.getElementById("razorpay-js")) return resolve(true);
  const script = document.createElement("script");
  script.id = "razorpay-js";
  script.src = "https://checkout.razorpay.com/v1/checkout.js";
  script.onload = () => resolve(true);
  script.onerror = () => resolve(false);
  document.body.appendChild(script);
});

function CheckoutInner() {
  const searchParams = useSearchParams();
  const planId = searchParams?.get("plan") || "pro";
  const billing = searchParams?.get("billing") || "monthly";
  const plan =
    (PLAN_DETAILS[planId as keyof typeof PLAN_DETAILS] ?? PLAN_DETAILS.pro) as {
      name: string;
      price: number;
    };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [email, setEmail] = useState("");
  const priceDisplay = billing === "annual" ? Math.round(plan.price * 12 * 0.8) : plan.price;

  useEffect(() => {
    log.info(`Checkout page loaded: plan=${planId}, billing=${billing}`);
    getSession().then((session) => {
      if (session?.user?.email) {
        log.info(`User session found: ${session.user.email}`);
        setUserEmail(session.user.email);
        setEmail(session.user.email);
      }
    });
  }, []);

  async function handleSubscribe() {
    log.step(`Starting checkout for plan: ${planId}`);
    setLoading(true);
    setError("");

    const session = await getSession();
    if (!session?.user) {
      setError("Please sign in to continue with checkout.");
      setLoading(false);
      setTimeout(() => { window.location.href = "/login"; }, 2000);
      return;
    }

    const loaded = await loadRazorpay();
    if (!loaded) {
      setError("Payment system failed to load. Please check your internet connection.");
      setLoading(false);
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/payments/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: planId,
          billing: billing,
          user_id: session?.user?.id || undefined,
          email: email || userEmail,
        }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || "Failed to create order");
      }

      if (data.order_id && data.razorpay_key) {
        const options = {
          key: data.razorpay_key,
          amount: data.amount,
          currency: data.currency,
          order_id: data.order_id,
          name: "LinkGuardian.AI",
          description: `${plan.name} Plan (${billing})`,
          handler: async function (response: any) {
            try {
              const verifyRes = await fetch(`${apiUrl}/api/payments/verify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  ...response,
                  user_id: session?.user?.id,
                  plan: planId
                })
              });
              const verifyData = await verifyRes.json();
              if (verifyData.success) {
                 window.location.href = "/dashboard?success=true";
              } else {
                 setError("Payment verification failed");
              }
            } catch(e) {
               setError("Verification network error");
            }
          },
          prefill: { email: email || userEmail },
          theme: { color: "#4f46e5" }
        };
        
        const rzp = new (window as any).Razorpay(options);
        rzp.on("payment.failed", function (response: any) {
           setError(response.error.description);
        });
        rzp.open();
      } else {
        setError("Invalid response from payment gateway.");
      }
    } catch (err: any) {
      log.error("Checkout network error:", err);
      setError(err.message || "Network error. Please try again.");
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
              <span className="text-3xl font-extrabold text-white">₹{priceDisplay}</span>
              <span className="text-zinc-500 text-xs">/{billing === "annual" ? "year" : "month"}</span>
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
            {loading ? "Processing..." : `Subscribe Now`}
          </button>

          <p className="text-center text-[10px] text-zinc-550 mt-5 leading-normal">
            Secure checkout processed by Razorpay.<br />Cancel anytime in one-click.
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
