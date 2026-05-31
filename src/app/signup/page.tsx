"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUp } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    
    setLoading(true);
    setError("");

    const { error: err, data } = await signUp(email, password, fullName);
    if (err) {
      setError(err.message);
      setLoading(false);
    } else {
      // If auto-login happened (email confirm disabled), sync immediately
      if (data?.session) {
        try {
          const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
          await fetch(`${API}/api/users/sync`, {
            method: "POST",
            headers: { Authorization: `Bearer ${data.session.access_token}` }
          });
        } catch(e) { console.error("Sync error", e); }
      }
      setSuccess(true);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--bg-primary)" }}>
        <div className="text-center max-w-sm mx-auto p-8 rounded-3xl shadow-2xl animate-scaleIn" style={{ background: "var(--bg-card-glass)", backdropFilter: "blur(20px)", border: "1.5px solid var(--border-card)" }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: "var(--accent-green-bg)", color: "var(--accent-green)", border: "1px solid rgba(16,185,129,0.25)" }}>
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold mb-3" style={{ color: "var(--text-primary)" }}>Check Your Email</h1>
          <p className="text-sm mb-8 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            We've sent a secure verification link to <strong style={{ color: "var(--text-primary)" }}>{email}</strong>. Check your inbox to activate your account.
          </p>
          <a href="/login" className="btn-primary inline-block w-full py-3">Proceed to Sign In</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--bg-primary)" }}>
      {/* Background orb */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(108,71,255,0.10) 0%, transparent 70%)", filter: "blur(60px)" }} />

      <div className="w-full max-w-sm mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white mx-auto mb-5 animate-float" style={{ background: "var(--accent-gradient)", boxShadow: "0 8px 32px rgba(108,71,255,0.35)" }}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
            </svg>
          </div>
          <h1 className="text-xl font-extrabold mb-1" style={{ color: "var(--text-primary)" }}>
            Create Account
          </h1>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Start protecting your affiliate revenue today
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6 shadow-xl animate-scaleIn" style={{ background: "var(--bg-card-glass)", backdropFilter: "blur(20px)", border: "1.5px solid var(--border-card)", boxShadow: "var(--shadow-xl)" }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl px-4 py-3 text-xs font-medium" style={{ background: "var(--accent-red-bg)", border: "1px solid rgba(239,68,68,0.25)", color: "var(--accent-red)" }}>
                {error}
              </div>
            )}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="input-premium"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>Email Address</label>
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
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                minLength={6}
                className="input-premium"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2">
              {loading ? "Creating Account…" : "Create Account"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6 font-semibold" style={{ color: "var(--text-tertiary)" }}>
          Already have an account?{" "}
          <a href="/login" className="font-bold transition-colors" style={{ color: "var(--accent)" }}>
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
