"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error: err, data } = await signIn(email, password);
    if (err) { 
      setError(err.message === "Email not confirmed" ? "Please verify your email address before signing in." : err.message); 
      setLoading(false); 
    } else { 
      try {
        const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        await fetch(`${API}/api/users/sync`, {
          method: "POST",
          headers: { Authorization: `Bearer ${data.session?.access_token}` }
        });
      } catch(e) { console.error("Sync error", e); }
      router.push("/dashboard"); 
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* Background orb */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(108,71,255,0.10) 0%, transparent 70%)", filter: "blur(60px)" }}
      />

      <div className="w-full max-w-sm mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white mx-auto mb-5 animate-float"
            style={{ background: "var(--accent-gradient)", boxShadow: "0 8px 32px rgba(108,71,255,0.35)" }}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <h1 className="text-xl font-extrabold mb-1" style={{ color: "var(--text-primary)" }}>
            Welcome back
          </h1>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Sign in to your <strong>LinkGuardian.AI</strong> dashboard
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6 shadow-xl animate-scaleIn"
          style={{
            background: "var(--bg-card-glass)",
            backdropFilter: "blur(20px)",
            border: "1.5px solid var(--border-card)",
            boxShadow: "var(--shadow-xl)",
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                className="rounded-xl px-4 py-3 text-xs font-medium"
                style={{ background: "var(--accent-red-bg)", border: "1px solid rgba(239,68,68,0.25)", color: "var(--accent-red)" }}
              >
                {error}
              </div>
            )}
            <div>
              <label
                className="block text-[11px] font-bold uppercase tracking-wider mb-2"
                style={{ color: "var(--text-tertiary)" }}
              >
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="input-premium"
              />
            </div>
            <div>
              <label
                className="block text-[11px] font-bold uppercase tracking-wider mb-2"
                style={{ color: "var(--text-tertiary)" }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="input-premium"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2">
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6 font-semibold" style={{ color: "var(--text-tertiary)" }}>
          New to LinkGuardian.AI?{" "}
          <a href="/signup" className="font-bold transition-colors" style={{ color: "var(--accent)" }}>
            Create account
          </a>
        </p>
      </div>
    </div>
  );
}
