"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { cn, log, formatINR, formatDate, truncate } from "@/lib/utils";
import { getSession, signOut } from "@/lib/supabase";
import { useTheme } from "@/lib/components/ThemeProvider";
import { ThemeToggle } from "@/lib/components/ThemeToggle";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserProfile { id: string; email?: string; full_name?: string; plan: string; }
interface DashboardStats { total_scans: number; total_links_checked: number; total_broken_found: number; estimated_monthly_loss_inr: number; plan: string; monitored_sites_count: number; last_scan_at: string | null; }
interface ScanRecord { id: string; created_at: string; page_url: string; total_links: number; broken_count: number; ok_count: number; redirect_count: number; unverifiable_count?: number; estimated_loss: number; }
interface MonitoredSite { id: string; url: string; name?: string; site_type: string; last_scanned_at: string | null; is_active: boolean; created_at: string; }
interface UserSettings { email_alerts: boolean; weekly_report: boolean; whatsapp_alerts: boolean; }

// ─── SVG Icons ─────────────────────────────────────────────────────────────────

const S = {
  logo: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="6" fill="url(#lg)"/>
      <circle cx="12" cy="12" r="5" fill="rgba(255,255,255,0.2)" stroke="white" strokeWidth="1.2"/>
      <path d="M12 9v3l2 2" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="24" y2="24">
          <stop stopColor="#4f46e5"/>
          <stop offset="1" stopColor="#6366f1"/>
        </linearGradient>
      </defs>
    </svg>
  ),
  nav: (a: boolean) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a ? "var(--accent)" : "currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1"/>
      <rect x="14" y="3" width="7" height="5" rx="1"/>
      <rect x="14" y="12" width="7" height="9" rx="1"/>
      <rect x="3" y="16" width="7" height="5" rx="1"/>
    </svg>
  ),
  scan: (a: boolean) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a ? "var(--accent)" : "currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/>
    </svg>
  ),
  history: (a: boolean) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a ? "var(--accent)" : "currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  globe: (a: boolean) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a ? "var(--accent)" : "currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  gear: (a: boolean) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a ? "var(--accent)" : "currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 0 2.83-2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  chevronRight: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>),
  check: () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>),
  x: () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>),
  arrowUp: () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>),
  external: () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>),
  plus: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>),
  trash: () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>),
  youtube: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.94 2C5.12 20 12 20 12 20s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></svg>),
  link: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>),
};

// ─── Animated Counter ──────────────────────────────────────────────────────────

function AnimatedCounter({ value, suffix = "", prefix = "" }: { value: number | string; suffix?: string; prefix?: string }) {
  const [display, setDisplay] = useState("0");
  const ref = useRef<HTMLSpanElement>(null);
  const num = typeof value === "string" ? parseInt(value.replace(/[^0-9]/g, "")) || 0 : value;

  useEffect(() => {
    setDisplay(num.toLocaleString("en-IN"));
  }, [num]);

  return <span ref={ref} className="font-nums">{prefix}{display}{suffix}</span>;
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color, trend, delay = 0 }: {
  label: string; value: React.ReactNode; icon: React.ReactNode; color?: string; trend?: { up: boolean; text: string }; delay?: number;
}) {
  return (
    <div
      className="rounded-2xl p-5 border animate-slideUp transition-all duration-300 hover:shadow-md group"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold tracking-wider uppercase text-zinc-500" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors group-hover:scale-105 transition-transform duration-300" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--accent)' }}>
          {icon}
        </div>
      </div>
      <div className="text-xl font-bold mb-0.5 tracking-tight font-nums" style={{ color: color || 'var(--text-primary)' }}>
        {value}
      </div>
      {trend && (
        <div className="flex items-center gap-1 text-[11px] font-medium" style={{ color: trend.up ? 'var(--accent-green)' : 'var(--accent-red)' }}>
          <span className={cn("transition-transform", trend.up ? "" : "rotate-180")}><S.arrowUp /></span>
          {trend.text}
        </div>
      )}
    </div>
  );
}

// ─── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; style: string }> = {
    broken: { label: "Broken", style: "bg-red-500/10 text-red-400 border-red-500/15 dark:bg-red-500/5 dark:text-red-400/80" },
    out_of_stock: { label: "OOS", style: "bg-orange-500/10 text-orange-400 border-orange-500/15 dark:bg-orange-500/5 dark:text-orange-400/80" },
    timeout: { label: "Timeout", style: "bg-zinc-500/10 text-zinc-400 border-zinc-500/15 dark:bg-zinc-500/5 dark:text-zinc-400/80" },
    redirect: { label: "Redirect", style: "bg-blue-500/10 text-blue-400 border-blue-500/15 dark:bg-blue-500/5 dark:text-blue-400/80" },
    unverifiable: { label: "Unverified", style: "bg-zinc-500/10 text-zinc-400 border-zinc-500/15 dark:bg-zinc-500/5 dark:text-zinc-400/80" },
    ok: { label: "OK", style: "bg-emerald-500/10 text-emerald-400 border-emerald-500/15 dark:bg-emerald-500/5 dark:text-emerald-400/80" },
  };
  const b = map[status] || { label: status, style: "bg-zinc-500/10 text-zinc-400 border-zinc-500/15" };
  return <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider", b.style)}>{b.label}</span>;
}

// ─── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ icon, title, desc, action }: { icon: string; title: string; desc: string; action?: React.ReactNode }) {
  // Convert standard emojis into beautifully styled layout
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-12 h-12 rounded-2xl bg-zinc-900/40 border border-zinc-800 flex items-center justify-center text-xl mb-5 text-zinc-400">
        {icon === "🔍" && S.scan(false)}
        {icon === "📋" && S.history(false)}
        {icon === "🌐" && S.globe(false)}
        {icon !== "🔍" && icon !== "📋" && icon !== "🌐" && <span>{icon}</span>}
      </div>
      <h3 className="text-sm font-bold mb-1.5 text-zinc-200">{title}</h3>
      <p className="text-xs max-w-sm mb-6" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
      {action}
    </div>
  );
}

// ─── Toggle ────────────────────────────────────────────────────────────────────

function ToggleSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={cn(
        "relative w-10 h-5.5 rounded-full transition-all duration-200 shrink-0",
        value ? "shadow-glow" : ""
      )}
      style={{ backgroundColor: value ? 'var(--accent)' : 'var(--border-color)' }}
    >
      <div className={cn(
        "absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow-md transition-all duration-200",
        value ? "left-[20px]" : "left-0.5"
      )} />
    </button>
  );
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("home");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [scanPageNum, setScanPageNum] = useState(1);
  const [scanTotal, setScanTotal] = useState(0);
  const [sites, setSites] = useState<MonitoredSite[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [siteUrl, setSiteUrl] = useState("");
  const [siteName, setSiteName] = useState("");
  const [addingSite, setAddingSite] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showAddSite, setShowAddSite] = useState(false);

  // Scan state
  const [inputMode, setInputMode] = useState<"url" | "youtube">("url");
  const [scanInput, setScanInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [ytResult, setYtResult] = useState<any>(null);

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const isDev = typeof window !== "undefined" && window.location.hostname === "localhost";

  // ── Auth ─────────────────────────────────────────────────────────────────────

  useEffect(() => {
    getSession().then(async (session) => {
      if (session?.user) {
        const meta = session.user.user_metadata;
        setUser({ id: session.user.id, email: session.user.email, full_name: meta?.full_name || "User", plan: "free" });
        await loadData(session.access_token);
      } else if (isDev) {
        log.info("Dev mode: auto-login");
        setUser({ id: "dev", email: "dev@local.dev", full_name: "Developer", plan: "admin" });
        await loadDevData();
      } else {
        setUser(null); setLoading(false);
      }
    });
  }, []);

  async function loadData(token: string) {
    try {
      const [sr, scr] = await Promise.all([
        fetch(`${API}/api/users/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/users/scans?page=1&per_page=20`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (sr.ok) { const d = await sr.json(); setStats(d); setUser(p => p ? { ...p, plan: d.plan } : p); }
      if (scr.ok) { const d = await scr.json(); setScans(d.scans); setScanTotal(d.total); }
    } catch { await loadDevData(); } finally { setLoading(false); }
  }

  async function loadDevData() {
    setStats({ total_scans: 12, total_links_checked: 342, total_broken_found: 17, estimated_monthly_loss_inr: 8500, plan: "admin", monitored_sites_count: 2, last_scan_at: new Date().toISOString() });
    setScans([
      { id: "1", created_at: new Date().toISOString(), page_url: "https://myblog.com/best-laptops-2026", total_links: 42, broken_count: 3, ok_count: 36, redirect_count: 3, estimated_loss: 1500 },
      { id: "2", created_at: new Date(Date.now() - 86400000).toISOString(), page_url: "https://myblog.com/top-cameras", total_links: 28, broken_count: 1, ok_count: 25, redirect_count: 2, estimated_loss: 500 },
      { id: "3", created_at: new Date(Date.now() - 172800000).toISOString(), page_url: "https://myblog.com/protein-supplements", total_links: 55, broken_count: 7, ok_count: 44, redirect_count: 4, estimated_loss: 3500 },
    ]);
    setScanTotal(3);
    setLoading(false);
  }

  const getToken = useCallback(async () => (await getSession())?.access_token, []);

  // ── Scan ─────────────────────────────────────────────────────────────────────

  async function runScan() {
    if (!scanInput.trim() || scanning) return;
    setScanning(true);
    setScanResult(null);
    setYtResult(null);
    try {
      const token = await getToken();
      const endpoint = inputMode === "youtube" ? "/api/check-youtube-channel" : "/api/check-links";
      const body = inputMode === "youtube"
        ? JSON.stringify({ channel_handle: scanInput })
        : JSON.stringify({ links: [{ url: scanInput, anchor_text: scanInput, context: "" }], page_url: scanInput, user_id: user?.id });
      const res = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body,
      });
      const data = await res.json();
      if (inputMode === "youtube") setYtResult(data);
      else setScanResult(data);
    } catch { setScanResult({ error: "Could not reach API. Make sure backend is running." }); }
    finally { setScanning(false); }
  }

  // ── Monitored Sites ──────────────────────────────────────────────────────────

  async function addSite() {
    if (!siteUrl.trim()) return;
    setAddingSite(true);
    try {
      const token = await getToken();
      await fetch(`${API}/api/users/monitored-sites`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url: siteUrl, name: siteName || siteUrl }),
      });
      const r = await fetch(`${API}/api/users/monitored-sites`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { const d = await r.json(); setSites(d.sites); }
      setSiteUrl(""); setSiteName(""); setShowAddSite(false);
    } catch { /* ignore */ } finally { setAddingSite(false); }
  }

  async function deleteSite(id: string) {
    try {
      const token = await getToken();
      await fetch(`${API}/api/users/monitored-sites/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setSites(p => p.filter(s => s.id !== id));
    } catch { /* ignore */ }
  }

  // ── Nav ──────────────────────────────────────────────────────────────────────

  const nav = [
    { id: "home", icon: S.nav, label: "Home" },
    { id: "scanner", icon: S.scan, label: "Scan" },
    { id: "history", icon: S.history, label: "History" },
    { id: "sites", icon: S.globe, label: "Sites" },
    { id: "settings", icon: S.gear, label: "Settings" },
  ];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="flex flex-col items-center gap-4">
        {S.logo()}
        <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--accent)' }} />
      </div>
    </div>
  );

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="text-center animate-fadeIn max-w-sm p-8 border border-zinc-800 bg-[#0c0c0e] rounded-2xl shadow-xl">
        <div className="flex justify-center mb-6">{S.logo()}</div>
        <h1 className="text-xl font-bold mb-2">Welcome Back</h1>
        <p className="text-xs mb-8" style={{ color: 'var(--text-secondary)' }}>Please sign in to access your link monitoring dashboard</p>
        <a href="/login" className="inline-flex items-center justify-center gap-2 font-bold w-full py-3 rounded-xl text-xs text-white transition-all hover:opacity-90 glow" style={{ background: 'var(--accent-gradient)' }}>
          Sign In
        </a>
      </div>
    </div>
  );

  const planBadge = (p: string) => {
    const c: Record<string, string> = { 
      free: "bg-zinc-500/10 text-zinc-400 border-zinc-500/25", 
      pro: "bg-indigo-500/10 text-indigo-400 border-indigo-500/25", 
      admin: "bg-amber-500/10 text-amber-400 border-amber-500/25" 
    };
    return c[p] || c.free;
  };

  const planCta = stats?.plan === "free" ? (
    <a href="/pricing" className="w-full text-center text-xs font-bold py-2.5 rounded-xl text-white transition-all hover:opacity-90 block" style={{ background: 'var(--accent-gradient)' }}>Upgrade to Pro</a>
  ) : null;

  // ═══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* ── Sidebar (Desktop) ─────────────────────────────────────────────── */}
      <aside className="hidden md:flex w-64 flex-col shrink-0 border-r" style={{ backgroundColor: 'var(--sidebar-bg)', borderColor: 'var(--sidebar-border)' }}>
        <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: 'var(--sidebar-border)' }}>
          <a href="/" className="flex items-center gap-2.5 group">
            <div className="transition-transform duration-300 group-hover:scale-105">{S.logo()}</div>
            <span className="font-extrabold text-sm tracking-tight text-white">
              Expire<span className="text-indigo-400">LinkX</span>
            </span>
          </a>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {nav.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group"
              style={{ backgroundColor: activeTab === item.id ? 'var(--bg-nav-active)' : 'transparent', color: activeTab === item.id ? 'var(--accent)' : 'var(--text-secondary)' }}
            >
              <span className="transition-transform duration-200 group-hover:scale-105">{item.icon(activeTab === item.id)}</span>
              {item.label}
              {activeTab === item.id && <span className="ml-auto w-1 h-1 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t" style={{ borderColor: 'var(--sidebar-border)' }}>
          <div className="rounded-2xl p-4 relative overflow-hidden bg-zinc-950/20 border border-zinc-900">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider", planBadge(stats?.plan || "free"))}>{stats?.plan || "FREE"}</span>
              </div>
              <div className="text-[11px] mb-4 font-nums" style={{ color: 'var(--text-tertiary)' }}>
                <AnimatedCounter value={stats?.total_scans || 0} /> scans · <AnimatedCounter value={stats?.total_links_checked || 0} /> links
              </div>
              {planCta}
            </div>
          </div>
        </div>
      </aside>

      {/* ── Mobile Nav ───────────────────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex border-t" style={{ backgroundColor: 'var(--sidebar-bg)', borderColor: 'var(--sidebar-border)' }}>
        {nav.map(item => (
          <button key={item.id} onClick={() => setActiveTab(item.id)}
            className="flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-semibold transition-colors"
            style={{ color: activeTab === item.id ? 'var(--accent)' : 'var(--text-tertiary)' }}
          >
            {item.icon(activeTab === item.id)}
            {item.label}
          </button>
        ))}
      </nav>

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <main className="flex-1 min-h-screen pb-20 md:pb-0 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b glass" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center justify-between px-6 md:px-8 py-3.5">
            <div>
              <h1 className="text-base font-bold tracking-tight text-white">{nav.find(n => n.id === activeTab)?.label || "Dashboard"}</h1>
              <p className="text-[11px] hidden sm:block mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                {activeTab === "home" && "Overview of affiliate link health metrics."}
                {activeTab === "scanner" && "Input URLs or channel tags to search for broken products."}
                {activeTab === "history" && "Audit log of all previously initiated scans."}
                {activeTab === "sites" && "Websites currently configured for active monitoring."}
                {activeTab === "settings" && "Configure account properties and integration profiles."}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <div className="relative">
                <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all duration-200 hover:bg-[var(--bg-hover)]"
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white bg-indigo-650">
                    {(user.full_name || "U").charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-xs font-bold leading-none text-white">{user.full_name}</div>
                    <div className="text-[9px] mt-0.5 uppercase tracking-widest text-zinc-500">{stats?.plan || "free"} plan</div>
                  </div>
                </button>
                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-48 rounded-xl border shadow-lg z-20 overflow-hidden animate-scaleIn bg-zinc-950 border-zinc-800">
                      <div className="px-4 py-2.5 border-b text-[10px] text-zinc-500 font-mono" style={{ borderColor: 'var(--border-color)' }}>{user.email}</div>
                      <a href="/pricing" className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors">
                        <S.plus /> Upgrade Plan
                      </a>
                      <button onClick={async () => { await signOut(); window.location.href = "/login"; }}
                        className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-rose-400 hover:bg-zinc-900 transition-colors border-t border-zinc-900">
                        <S.x /> Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="p-6 md:p-8 max-w-5xl w-full mx-auto space-y-6 flex-1">

          {/* ════ HOME ════ */}
          {activeTab === "home" && (
            <div className="space-y-6 animate-fadeIn">
              {/* Hero prompt */}
              <div className="rounded-2xl p-6 md:p-8 relative overflow-hidden bg-zinc-950 border border-zinc-800/80">
                <div className="relative z-10">
                  <h2 className="text-lg md:text-xl font-bold mb-2 text-white">
                    Scan a page or channel handle
                  </h2>
                  <p className="text-xs mb-5 max-w-lg leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    Find broken product links, outdated redirect pathways, and Amazon out-of-stock listings before they impact your commissions.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button onClick={() => { setActiveTab("scanner"); setInputMode("url"); }}
                      className="inline-flex items-center justify-center gap-2 font-bold px-5 py-2.5 rounded-xl text-xs text-white transition-all hover:opacity-90 shadow-sm" style={{ background: 'var(--accent-gradient)' }}>
                      <S.link /> Scan URL
                    </button>
                    <button onClick={() => { setActiveTab("scanner"); setInputMode("youtube"); }}
                      className="inline-flex items-center justify-center gap-2 font-bold px-5 py-2.5 rounded-xl text-xs transition-all hover:bg-zinc-800 text-zinc-300 bg-zinc-900 border border-zinc-800">
                      <S.youtube /> Scan YouTube
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Links Checked" value={<AnimatedCounter value={stats?.total_links_checked || 0} />} icon={<S.link />} delay={0} />
                <StatCard label="Broken Found" value={<AnimatedCounter value={stats?.total_broken_found || 0} />} icon={<S.x />} color="var(--accent-red)" delay={100} />
                <StatCard label="Sites Monitored" value={<AnimatedCounter value={stats?.monitored_sites_count || 0} />} icon={S.globe(false)} delay={200} />
                <StatCard label="Monthly Loss" value={formatINR(stats?.estimated_monthly_loss_inr || 0)} icon={<S.arrowUp />} color="var(--accent-orange)" delay={300} />
              </div>

              {/* Recent scans */}
              <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <div className="flex items-center justify-between px-5 py-4.5 border-b bg-zinc-950/20" style={{ borderColor: 'var(--border-color)' }}>
                  <h2 className="font-bold text-xs text-white">Recent Scans</h2>
                  <button onClick={() => setActiveTab("history")} className="text-xs font-semibold flex items-center gap-1 transition-colors hover:opacity-85 text-indigo-400">
                    View All <S.chevronRight />
                  </button>
                </div>
                {scans.length === 0 ? (
                  <EmptyState icon="🔍" title="No scans record" desc="Run your first page or channel link audit to populate the dashboard." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b text-zinc-500 font-semibold text-[10px] uppercase tracking-wider bg-zinc-950/10" style={{ borderColor: 'var(--border-color)' }}>
                          <th className="px-5 py-3">Page</th>
                          <th className="text-center px-5 py-3">Links Checked</th>
                          <th className="text-center px-5 py-3">Broken Found</th>
                          <th className="text-right px-5 py-3">Date Completed</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y text-xs" style={{ borderColor: 'var(--border-color)' }}>
                        {scans.slice(0, 5).map((s, i) => (
                          <tr key={s.id} className="transition-all duration-205 hover:bg-[var(--bg-hover)]" style={{ animationDelay: `${i * 40}ms` }}>
                            <td className="px-5 py-4 font-mono truncate max-w-[200px] md:max-w-xs text-zinc-300">{truncate(s.page_url, 45)}</td>
                            <td className="px-5 py-4 text-center font-nums text-zinc-400">{s.total_links}</td>
                            <td className="px-5 py-4 text-center font-nums">
                              <span className="font-bold" style={{ color: s.broken_count > 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>{s.broken_count}</span>
                            </td>
                            <td className="px-5 py-4 text-right text-zinc-500 font-mono text-[11px]">{formatDate(s.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════ SCANNER ════ */}
          {activeTab === "scanner" && (
            <div className="space-y-6 animate-fadeIn">
              {/* Mode toggle */}
              <div className="flex gap-1 p-1 rounded-xl border w-fit" style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}>
                {(["url", "youtube"] as const).map(m => (
                  <button key={m} onClick={() => { setInputMode(m); setScanResult(null); setYtResult(null); }}
                    className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200",
                      inputMode === m ? "shadow-sm bg-white text-zinc-950 dark:bg-zinc-900 dark:text-white" : "hover:bg-[var(--bg-hover)] text-zinc-400")}
                  >
                    {m === "url" ? <S.link /> : <S.youtube />}
                    {m === "url" ? "Web Page" : "YouTube Channel"}
                  </button>
                ))}
              </div>

              {/* Input */}
              <div className="rounded-2xl border p-5 md:p-6" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <h2 className="font-bold text-sm text-white mb-1.5">
                  {inputMode === "url" ? "Scan a Web Page" : "Scan a YouTube Channel"}
                </h2>
                <p className="text-xs mb-5" style={{ color: 'var(--text-secondary)' }}>
                  {inputMode === "url"
                    ? "Specify a target URL to check all outgoing links. Ideal for product reviews, blogs, and landing pages."
                    : "Enter a public YouTube channel handle to parse video descriptions for dead partner links."}
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                      {inputMode === "url" ? <S.link /> : <S.youtube />}
                    </div>
                    <input
                      value={scanInput}
                      onChange={e => setScanInput(e.target.value)}
                      placeholder={inputMode === "url" ? "https://example.com/page-to-check" : "@ChannelHandle"}
                      className="w-full rounded-xl px-10 py-3 text-xs border outline-none transition-all duration-200 focus:border-indigo-500/50"
                      style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text-primary)' }}
                      onKeyDown={e => e.key === "Enter" && runScan()}
                    />
                  </div>
                  <button onClick={runScan} disabled={scanning || !scanInput.trim()}
                    className="inline-flex items-center justify-center gap-2 font-bold px-6 py-3 rounded-xl text-xs text-white transition-all duration-200 hover:opacity-90 disabled:opacity-40 disabled:hover:scale-100 glow"
                    style={{ background: 'var(--accent-gradient)' }}>
                    {scanning ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : S.scan(false)}
                    {scanning ? "Scanning…" : "Scan Now"}
                  </button>
                </div>
              </div>

              {/* Web Page Results */}
              {scanResult && !scanResult.error && (
                <div className="rounded-2xl border overflow-hidden animate-slideUp" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                  <div className="p-5 border-b bg-zinc-950/20" style={{ borderColor: 'var(--border-color)' }}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-900 border border-zinc-800 text-zinc-300"><S.link /></div>
                        <div>
                          <div className="font-bold text-xs text-white">Results for Page Audit</div>
                          <div className="text-[10px] text-zinc-500 font-mono mt-0.5 truncate max-w-[240px] sm:max-w-md">{scanResult.page_url}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="text-center px-3 py-1.5 rounded-lg border border-emerald-500/10 bg-emerald-500/5">
                          <div className="text-xs font-bold font-nums" style={{ color: 'var(--accent-green)' }}>{scanResult.summary?.ok || 0}</div>
                          <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">OK</div>
                        </div>
                        <div className="text-center px-3 py-1.5 rounded-lg border border-rose-500/10 bg-rose-500/5">
                          <div className="text-xs font-bold font-nums" style={{ color: 'var(--accent-red)' }}>{scanResult.summary?.broken || 0}</div>
                          <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Dead</div>
                        </div>
                        <div className="text-center px-3 py-1.5 rounded-lg border border-blue-500/10 bg-blue-500/5">
                          <div className="text-xs font-bold font-nums" style={{ color: 'var(--accent-blue)' }}>{scanResult.summary?.redirects || 0}</div>
                          <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Redirect</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {(scanResult.broken_links || []).length > 0 ? (
                    <div className="divide-y text-xs" style={{ borderColor: 'var(--border-color)' }}>
                      {scanResult.broken_links.slice(0, 10).map((link: any, i: number) => (
                        <div key={i} className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-[var(--bg-hover)] transition-colors">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <StatusBadge status={link.status} />
                            <span className="font-mono text-[11px] truncate text-zinc-400">{link.url}</span>
                          </div>
                          {link.estimated_loss && <span className="text-[11px] font-semibold shrink-0 font-nums text-amber-500">Loss: ₹{link.estimated_loss}</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-xs text-zinc-500 font-semibold bg-zinc-950/10">No broken links detected on this page.</div>
                  )}
                </div>
              )}

              {/* YouTube Results */}
              {ytResult && !ytResult.error && (
                <div className="rounded-2xl border overflow-hidden animate-slideUp" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                  <div className="p-5 border-b bg-zinc-950/20" style={{ borderColor: 'var(--border-color)' }}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-zinc-900 border border-zinc-800 text-rose-450"><S.youtube /></div>
                      <div>
                        <div className="font-bold text-xs text-white">{ytResult.channel?.name || "Channel Details"}</div>
                        <div className="text-[10px] text-zinc-500 font-mono">@{ytResult.channel?.handle}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {[
                        { label: "Videos", value: ytResult.summary?.videos_scanned, color: "" },
                        { label: "Links", value: ytResult.summary?.total_links_checked, color: "" },
                        { label: "Broken", value: ytResult.summary?.broken_links, color: 'var(--accent-red)' },
                        { label: "Unverified", value: ytResult.summary?.unverifiable_links || 0, color: 'var(--text-tertiary)' },
                        { label: "Est Loss", value: formatINR(ytResult.summary?.estimated_monthly_loss_inr || 0), color: 'var(--accent-orange)' },
                      ].map(s => (
                        <div key={s.label} className="text-center p-3 rounded-xl border border-zinc-900 bg-zinc-950/10">
                          <div className="text-base font-bold font-nums" style={{ color: s.color || 'var(--text-primary)' }}>{s.value}</div>
                          <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mt-1">{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {Object.entries(ytResult.broken_by_video || {}).map(([videoId, data]: [string, any]) => (
                    <details key={videoId} className="border-b group" style={{ borderColor: 'var(--border-color)' }}>
                      <summary className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[var(--bg-hover)] transition-colors list-none select-none">
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="text-xs font-bold truncate text-white">{data.title}</div>
                          <a href={`https://youtu.be/${videoId}`} target="_blank" className="text-[10px] inline-flex items-center gap-1 hover:underline text-indigo-400 mt-1 font-mono">
                            youtu.be/{videoId} <S.external />
                          </a>
                        </div>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded border font-nums shrink-0 bg-rose-500/10 border-rose-500/15 text-rose-450 uppercase tracking-wider">
                          {data.broken_links.length} Broken
                        </span>
                      </summary>
                      <div className="px-5 pb-4 space-y-2.5 pt-1.5 border-t border-zinc-900/40 bg-zinc-950/5">
                        {data.broken_links.map((link: any, i: number) => (
                          <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border border-zinc-900 bg-zinc-950/20 text-xs">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <StatusBadge status={link.status} />
                              <span className="font-mono text-[11px] truncate text-zinc-400">{link.url}</span>
                            </div>
                            {link.ai_suggestion && <span className="text-[10px] text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded-md font-semibold self-start sm:self-center">💡 {link.ai_suggestion}</span>}
                          </div>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              )}

              {/* Error state */}
              {(scanResult?.error || ytResult?.error) && (
                <div className="rounded-2xl border p-5 flex items-start gap-3.5 bg-rose-500/5 border-rose-500/10">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-rose-500/10 text-rose-450"><S.x /></div>
                  <div>
                    <div className="font-bold text-xs text-rose-400">Scan Operation Failed</div>
                    <div className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>{scanResult?.error || ytResult?.error}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════ HISTORY ════ */}
          {activeTab === "history" && (
            <div className="animate-fadeIn">
              <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                {scans.length === 0 ? (
                  <EmptyState icon="📋" title="Audit Log Empty" desc="Initiated scan histories will appear in this log view." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b text-zinc-500 font-semibold text-[10px] uppercase tracking-wider bg-zinc-950/10" style={{ borderColor: 'var(--border-color)' }}>
                          {["Target Page", "Total Links", "OK", "Broken", "Redirect", "Est. Monthly Loss", "Completed At"].map(h => (
                            <th key={h} className="px-5 py-3.5 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                        {scans.map((s, i) => (
                          <tr key={s.id} className="transition-all duration-200 hover:bg-[var(--bg-hover)]" style={{ animationDelay: `${i * 20}ms` }}>
                            <td className="px-5 py-4 font-mono truncate max-w-[180px] md:max-w-xs text-zinc-300" title={s.page_url}>{truncate(s.page_url, 40)}</td>
                            <td className="px-5 py-4 font-semibold font-nums text-zinc-400">{s.total_links}</td>
                            <td className="px-5 py-4 font-nums text-emerald-450">{s.ok_count}</td>
                            <td className="px-5 py-4 font-nums"><span className="font-bold" style={{ color: s.broken_count > 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>{s.broken_count}</span></td>
                            <td className="px-5 py-4 font-nums text-blue-450">{s.redirect_count}</td>
                            <td className="px-5 py-4 font-bold font-nums text-amber-500">{formatINR(s.estimated_loss)}</td>
                            <td className="px-5 py-4 text-zinc-500 font-mono text-[11px]">{formatDate(s.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════ SITES ════ */}
          {activeTab === "sites" && (
            <div className="space-y-6 animate-fadeIn">
              {showAddSite && (
                <div className="rounded-2xl border p-5 animate-scaleIn bg-zinc-950 border-zinc-800">
                  <h3 className="font-bold text-xs text-white mb-3 uppercase tracking-wider">Configure New Website</h3>
                  <div className="flex flex-col sm:flex-row gap-2.5 mb-4">
                    <input value={siteName} onChange={e => setSiteName(e.target.value)} placeholder="Friendly Label (optional)"
                      className="rounded-xl px-4 py-2.5 text-xs border outline-none transition-all sm:w-44 bg-zinc-900 border-zinc-800 text-white focus:border-indigo-500/50" />
                    <input value={siteUrl} onChange={e => setSiteUrl(e.target.value)} placeholder="https://yoursite.com"
                      className="flex-1 rounded-xl px-4 py-2.5 text-xs border outline-none transition-all bg-zinc-900 border-zinc-800 text-white focus:border-indigo-500/50"
                      onKeyDown={e => e.key === "Enter" && addSite()} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={addSite} disabled={addingSite || !siteUrl.trim()}
                      className="font-bold px-5 py-2.5 rounded-xl text-xs text-white transition-all hover:opacity-90 disabled:opacity-40"
                      style={{ background: 'var(--accent-gradient)' }}>
                      {addingSite ? "Registering…" : "Register Website"}
                    </button>
                    <button onClick={() => setShowAddSite(false)} className="font-semibold px-5 py-2.5 rounded-xl text-xs text-zinc-400 hover:text-white transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {!showAddSite && (
                <button onClick={() => setShowAddSite(true)}
                  className="inline-flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-xs text-white transition-all hover:opacity-90 glow" style={{ background: 'var(--accent-gradient)' }}>
                  <S.plus /> Register Site
                </button>
              )}

              {sites.length === 0 && !showAddSite ? (
                <div className="rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                  <EmptyState icon="🌐" title="No Sites Registered" desc="Register your websites to initiate automated background link monitoring." />
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {sites.map(site => (
                    <div key={site.id} className="rounded-2xl border p-4 flex items-center justify-between hover:shadow-sm transition-all duration-200 group" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all border", site.is_active ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-450" : "bg-zinc-900 border-zinc-800 text-zinc-500")}>
                          {S.globe(false)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs truncate text-white">{site.name || site.url}</span>
                            <span className={cn("w-1 h-1 rounded-full", site.is_active ? "bg-emerald-455 animate-pulse" : "bg-zinc-650")} />
                          </div>
                          <div className="text-[10px] text-zinc-550 truncate mt-0.5 font-mono">{site.url}</div>
                          {site.last_scanned_at && <div className="text-[10px] text-zinc-600 mt-1">Audit run: {formatDate(site.last_scanned_at)}</div>}
                        </div>
                      </div>
                      <button onClick={() => deleteSite(site.id)} className="text-zinc-500 hover:text-rose-400 p-2 rounded-lg transition-colors md:opacity-0 group-hover:opacity-100">
                        <S.trash />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ════ SETTINGS ════ */}
          {activeTab === "settings" && (
            <div className="max-w-xl space-y-4 animate-fadeIn text-xs">
              <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-xs text-white">Visual Appearance</div>
                    <div className="text-[10px] mt-0.5 text-zinc-500">{theme === "dark" ? "Dark Mode Active" : "Light Mode Active"}</div>
                  </div>
                  <ThemeToggle />
                </div>
              </div>

              <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <div className="px-5 py-3.5 border-b bg-zinc-950/20" style={{ borderColor: 'var(--border-color)' }}>
                  <h3 className="font-bold text-xs text-white uppercase tracking-wider">Alert Configurations</h3>
                </div>
                {[
                  { key: "email_alerts", label: "Email Notifications", desc: "Alert me immediately if links fail on monitored properties." },
                  { key: "weekly_report", label: "Weekly Audit Digest", desc: "Compile a weekly overview report of portfolio link health." },
                ].map((item, idx) => {
                  const val = settings ? (settings as any)[item.key] : false;
                  return (
                    <div key={item.key} className={cn("flex items-center justify-between px-5 py-4", idx > 0 ? "border-t" : "")} style={{ borderColor: 'var(--border-color)' }}>
                      <div className="pr-4">
                        <div className="font-bold text-xs text-white">{item.label}</div>
                        <div className="text-[10px] mt-0.5 text-zinc-500">{item.desc}</div>
                      </div>
                      <ToggleSwitch value={val} onChange={v => {
                        setSettings(p => p ? { ...p, [item.key]: v } : p);
                        getToken().then(t => {
                          if (t) {
                            fetch(`${API}/api/users/settings`, {
                              method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
                              body: JSON.stringify({ [item.key]: v }),
                            });
                          }
                        });
                      }} />
                    </div>
                  );
                })}
              </div>

              <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <h3 className="font-bold text-xs text-white uppercase tracking-wider mb-4">Account Properties</h3>
                <div className="flex items-center gap-3.5 p-3 rounded-xl border border-zinc-900 bg-zinc-950/20 mb-5">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 bg-indigo-650">
                    {(user.full_name || "U").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-xs text-white truncate">{user.full_name}</div>
                    <div className="text-[10px] text-zinc-500 truncate font-mono">{user.email}</div>
                  </div>
                  <span className={cn("text-[9px] font-bold px-2 py-0.5 border rounded uppercase tracking-wider shrink-0", planBadge(stats?.plan || "free"))}>{stats?.plan || "free"}</span>
                </div>
                <div className="flex gap-2">
                  {stats?.plan === "free" && (
                    <a href="/pricing" className="font-bold px-5 py-2.5 rounded-xl text-xs text-white transition-all hover:opacity-90 block" style={{ background: 'var(--accent-gradient)' }}>
                      Upgrade Account
                    </a>
                  )}
                  <button onClick={async () => { await signOut(); window.location.href = "/login"; }}
                    className="font-bold px-5 py-2.5 rounded-xl text-xs text-rose-455 hover:bg-rose-500/5 transition-colors border border-rose-500/10">
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
