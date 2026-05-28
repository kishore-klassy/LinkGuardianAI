"use client";
import { useState, useEffect, useCallback } from "react";
import { cn, log, formatINR, formatDate, truncate } from "@/lib/utils";
import { getSession, signOut } from "@/lib/supabase";
import { useTheme } from "@/lib/components/ThemeProvider";
import { ThemeToggle } from "@/lib/components/ThemeToggle";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserProfile { id: string; email?: string; full_name?: string; plan: string; }
interface DashboardStats { total_scans: number; total_links_checked: number; total_broken_found: number; estimated_monthly_loss_inr: number; plan: string; monitored_sites_count: number; last_scan_at: string | null; }
interface ScanRecord { id: string; created_at: string; page_url: string; total_links: number; broken_count: number; ok_count: number; redirect_count: number; unverifiable_count?: number; estimated_loss: number; broken_links_data?: any[]; ok_links_data?: any[]; unverifiable_links_data?: any[]; redirect_links_data?: any[]; }
interface MonitoredSite { id: string; url: string; name?: string; site_type: string; last_scanned_at: string | null; is_active: boolean; created_at: string; }
interface UserSettings { email_alerts: boolean; weekly_report: boolean; whatsapp_alerts: boolean; }
interface LinkResult { url: string; anchor_text: string; context: string; status: string; status_code: number | null; final_url: string | null; error: string | null; ai_suggestion: string | null; estimated_loss: string | null; }

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const S = {
  logo: () => (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <rect width="26" height="26" rx="7" fill="url(#lg2)" />
      <path d="M13 7.5L13 13L16 15.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="13" cy="13" r="5.5" stroke="rgba(255,255,255,0.8)" strokeWidth="1.2" />
      <defs>
        <linearGradient id="lg2" x1="0" y1="0" x2="26" y2="26">
          <stop stopColor="#6C47FF" />
          <stop offset="1" stopColor="#9C6FFF" />
        </linearGradient>
      </defs>
    </svg>
  ),
  nav: (a: boolean) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a ? "var(--accent)" : "currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  scan: (a: boolean) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a ? "var(--accent)" : "currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /><line x1="11" y1="8" x2="11" y2="14" />
    </svg>
  ),
  history: (a: boolean) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a ? "var(--accent)" : "currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  globe: (a: boolean) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a ? "var(--accent)" : "currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  gear: (a: boolean) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a ? "var(--accent)" : "currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 0 2.83-2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  chevronRight: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>),
  chevronDown: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>),
  check: () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>),
  x: () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>),
  arrowUp: () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>),
  arrowDown: () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg>),
  external: () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>),
  plus: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>),
  trash: () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>),
  youtube: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.94 2C5.12 20 12 20 12 20s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" /><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" /></svg>),
  link: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>),
  copy: () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>),
  download: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>),
  lock: () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>),
  shield: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>),
  filter: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>),
  search: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>),
  zap: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>),
};

// ─── Toast System ─────────────────────────────────────────────────────────────

interface Toast { id: number; type: "success" | "error" | "info"; message: string; }
let toastIdCounter = 0;

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className="animate-toast pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold shadow-lg"
          style={{
            background: t.type === "success" ? "var(--accent-green-bg)" : t.type === "error" ? "var(--accent-red-bg)" : "var(--accent-light)",
            border: `1px solid ${t.type === "success" ? "var(--accent-green)" : t.type === "error" ? "var(--accent-red)" : "var(--accent)"}30`,
            color: t.type === "success" ? "var(--accent-green)" : t.type === "error" ? "var(--accent-red)" : "var(--accent)",
            backdropFilter: "blur(16px)",
            minWidth: "240px",
          }}
        >
          <span>{t.type === "success" ? "✓" : t.type === "error" ? "✕" : "ℹ"}</span>
          <span>{t.message}</span>
          <button onClick={() => onRemove(t.id)} className="ml-auto opacity-60 hover:opacity-100"><S.x /></button>
        </div>
      ))}
    </div>
  );
}

// ─── Animated Counter ─────────────────────────────────────────────────────────

function AnimatedCounter({ value, prefix = "" }: { value: number | string; prefix?: string }) {
  const num = typeof value === "string" ? parseInt(value.replace(/[^0-9]/g, "")) || 0 : value;
  return <span className="font-nums">{prefix}{num.toLocaleString("en-IN")}</span>;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, icon, accentColor, accentBg, trend, delay = 0
}: {
  label: string; value: React.ReactNode; icon: React.ReactNode;
  accentColor?: string; accentBg?: string; trend?: { up: boolean; text: string }; delay?: number;
}) {
  return (
    <div
      className="kpi-card animate-slideUp opacity-0"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "forwards" }}
    >
      {/* Icon */}
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: accentBg || "var(--accent-light)", color: accentColor || "var(--accent)" }}
        >
          {icon}
        </div>
        {trend && (
          <div
            className="flex items-center gap-1 text-[10px] font-bold"
            style={{ color: trend.up ? "var(--accent-green)" : "var(--accent-red)" }}
          >
            <span style={{ transform: trend.up ? "none" : "rotate(180deg)", display: "inline-block" }}>
              <S.arrowUp />
            </span>
            {trend.text}
          </div>
        )}
      </div>
      {/* Value */}
      <div className="text-2xl font-extrabold tracking-tight font-nums mb-1" style={{ color: accentColor || "var(--text-primary)" }}>
        {value}
      </div>
      {/* Label */}
      <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string; border: string }> = {
    broken:      { label: "Broken",     color: "var(--accent-red)",    bg: "var(--accent-red-bg)",    border: "rgba(239,68,68,0.25)"   },
    out_of_stock:{ label: "Out of Stock",color: "var(--accent-orange)", bg: "var(--accent-orange-bg)", border: "rgba(245,158,11,0.25)"  },
    timeout:     { label: "Timeout",    color: "var(--text-tertiary)",  bg: "var(--bg-hover)",         border: "var(--border-color)"    },
    redirect:    { label: "Redirect",   color: "var(--accent-blue)",   bg: "var(--accent-blue-bg)",   border: "rgba(59,130,246,0.25)"  },
    unverifiable:{ label: "Unverified", color: "var(--text-tertiary)",  bg: "var(--bg-hover)",         border: "var(--border-color)"    },
    ok:          { label: "OK",         color: "var(--accent-green)",  bg: "var(--accent-green-bg)",  border: "rgba(16,185,129,0.25)"  },
    error:       { label: "Error",      color: "var(--accent-red)",    bg: "var(--accent-red-bg)",    border: "rgba(239,68,68,0.25)"   },
    skipped:     { label: "Skipped",    color: "var(--text-tertiary)",  bg: "var(--bg-hover)",         border: "var(--border-color)"    },
  };
  const b = map[status] || { label: status, color: "var(--text-tertiary)", bg: "var(--bg-hover)", border: "var(--border-color)" };
  return (
    <span
      className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider whitespace-nowrap"
      style={{ color: b.color, background: b.bg, border: `1px solid ${b.border}` }}
    >
      {b.label}
    </span>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ icon, title, desc, action }: { icon: React.ReactNode; title: string; desc: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid var(--border-card)" }}
      >
        {icon}
      </div>
      <h3 className="text-sm font-bold mb-2" style={{ color: "var(--text-primary)" }}>{title}</h3>
      <p className="text-xs max-w-sm mb-6 leading-relaxed" style={{ color: "var(--text-secondary)" }}>{desc}</p>
      {action}
    </div>
  );
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────

function ToggleSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="relative w-11 h-6 rounded-full transition-all duration-200 shrink-0"
      style={{ background: value ? "var(--accent-gradient)" : "var(--border-color)", boxShadow: value ? "var(--shadow-glow)" : "none" }}
    >
      <div
        className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-200"
        style={{ left: value ? "22px" : "2px" }}
      />
    </button>
  );
}

// ─── YouTube Video Count Selector ────────────────────────────────────────────

const PLAN_VIDEO_LIMITS: Record<string, number> = {
  free: 50,
  starter: 50,
  pro: 200,
  agency: 200,
  admin: 200,
};

function VideoCountSelector({
  value, onChange, plan
}: {
  value: number; onChange: (v: number) => void; plan: string;
}) {
  const limit = PLAN_VIDEO_LIMITS[plan] || 50;
  const options = [
    { label: "5 videos", value: 5, minPlan: "free" },
    { label: "10 videos", value: 10, minPlan: "free" },
    { label: "20 videos", value: 20, minPlan: "free" },
    { label: "50 videos", value: 50, minPlan: "free" },
    { label: "100 videos", value: 100, minPlan: "pro" },
    { label: "200 videos", value: 200, minPlan: "pro" },
  ];

  return (
    <div
      className="rounded-2xl border p-4 mt-4 animate-fadeIn"
      style={{ background: "var(--bg-card)", border: "1.5px solid var(--border-card)" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <S.youtube />
        <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>How many videos to scan?</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => {
          const locked = opt.value > limit;
          return (
            <button
              key={opt.value}
              onClick={() => !locked && onChange(opt.value)}
              disabled={locked}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200",
                !locked && value === opt.value
                  ? "text-white"
                  : locked
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:border-[var(--border-hover)]"
              )}
              style={{
                background: !locked && value === opt.value ? "var(--accent-gradient)" : "var(--bg-hover)",
                border: !locked && value === opt.value ? "1.5px solid transparent" : "1.5px solid var(--border-card)",
                color: !locked && value === opt.value ? "#fff" : "var(--text-secondary)",
                boxShadow: !locked && value === opt.value ? "0 4px 12px rgba(108,71,255,0.30)" : "none",
              }}
            >
              {locked && <S.lock />}
              {opt.label}
            </button>
          );
        })}
      </div>
      {limit <= 20 && (
        <div
          className="mt-3 flex items-center gap-2 text-[10px] font-semibold px-3 py-2 rounded-xl"
          style={{ background: "var(--accent-purple-bg)", color: "var(--accent-purple)", border: "1px solid rgba(139,92,246,0.20)" }}
        >
          <S.lock />
          You're on the <strong>{plan.toUpperCase()}</strong> plan. Upgrade to Pro to scan up to 200 videos.
          <a href="/pricing" className="underline ml-1">Upgrade →</a>
        </div>
      )}
    </div>
  );
}

// ─── Link Results Table ───────────────────────────────────────────────────────

type FilterStatus = "all" | "broken" | "out_of_stock" | "redirect" | "ok" | "timeout" | "error";

const FILTER_OPTIONS: { label: string; value: FilterStatus; color: string }[] = [
  { label: "All", value: "all", color: "var(--text-secondary)" },
  { label: "Broken", value: "broken", color: "var(--accent-red)" },
  { label: "Out of Stock", value: "out_of_stock", color: "var(--accent-orange)" },
  { label: "Redirect", value: "redirect", color: "var(--accent-blue)" },
  { label: "OK", value: "ok", color: "var(--accent-green)" },
  { label: "Timeout", value: "timeout", color: "var(--text-tertiary)" },
  { label: "Error", value: "error", color: "var(--accent-red)" },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={copy}
      className="p-1 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
      style={{ color: copied ? "var(--accent-green)" : "var(--text-tertiary)", background: "var(--bg-hover)" }}
      title="Copy URL"
    >
      {copied ? <S.check /> : <S.copy />}
    </button>
  );
}

function exportToCSV(links: LinkResult[], filename: string) {
  const headers = ["URL", "Anchor Text", "Status", "Status Code", "Final URL", "Est. Loss", "AI Suggestion"];
  const rows = links.map(l => [
    l.url, l.anchor_text, l.status, l.status_code ?? "", l.final_url ?? "", l.estimated_loss ?? "", l.ai_suggestion ?? ""
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  a.click(); URL.revokeObjectURL(url);
}

function LinkResultsTable({ links, title, showBrokenHighlight = false }: {
  links: LinkResult[]; title: string; showBrokenHighlight?: boolean;
}) {
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const broken = links.filter(l => ["broken", "out_of_stock"].includes(l.status));
  const others = links.filter(l => !["broken", "out_of_stock"].includes(l.status));

  const filtered = links.filter(l => {
    if (filter !== "all" && l.status !== filter) return false;
    if (search && !l.url.toLowerCase().includes(search.toLowerCase()) && !l.anchor_text.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const pageCount = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const counts: Record<string, number> = { all: links.length };
  links.forEach(l => { counts[l.status] = (counts[l.status] || 0) + 1; });

  return (
    <div
      className="rounded-2xl border overflow-hidden animate-slideUp"
      style={{ background: "var(--bg-card)", border: "1.5px solid var(--border-card)" }}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border-color)", background: "var(--bg-tertiary)" }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{title}</h3>
          <button
            onClick={() => exportToCSV(filtered, `linkguardian-${title.toLowerCase().replace(/\s+/g, "-")}.csv`)}
            className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: "var(--accent)", background: "var(--accent-light)", border: "1px solid var(--border-card)" }}
          >
            <S.download /> Export CSV
          </button>
        </div>

        {/* Filter + Search row */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex flex-wrap gap-1.5">
            {FILTER_OPTIONS.map(opt => {
              const count = counts[opt.value] ?? 0;
              if (opt.value !== "all" && count === 0) return null;
              return (
                <button
                  key={opt.value}
                  onClick={() => { setFilter(opt.value); setPage(1); }}
                  className={cn("filter-chip", filter === opt.value && "active")}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: opt.value === "all" ? "var(--text-tertiary)" : opt.color }}
                  />
                  {opt.label}
                  <span className="font-bold text-[10px] ml-0.5">
                    {opt.value === "all" ? links.length : (counts[opt.value] || 0)}
                  </span>
                </button>
              );
            })}
          </div>
          {/* Search */}
          <div className="relative sm:ml-auto shrink-0">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-tertiary)" }}>
              <S.search />
            </span>
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Filter by URL..."
              className="input-premium pl-8 py-1.5 w-52 text-xs"
              style={{ padding: "0.375rem 0.75rem 0.375rem 2rem", fontSize: "0.75rem" }}
            />
          </div>
        </div>
      </div>

      {/* Broken links highlight strip */}
      {showBrokenHighlight && broken.length > 0 && filter === "all" && (
        <div
          className="px-5 py-2 border-b text-xs font-semibold flex items-center gap-2"
          style={{ background: "var(--accent-red-bg)", borderColor: "rgba(239,68,68,0.20)", color: "var(--accent-red)" }}
        >
          <S.zap />
          {broken.length} critical link{broken.length > 1 ? "s" : ""} need attention
          <button
            onClick={() => setFilter("broken")}
            className="ml-auto text-[10px] underline"
          >
            View all broken →
          </button>
        </div>
      )}

      {/* Table */}
      {paged.length === 0 ? (
        <div className="py-10 text-center text-xs" style={{ color: "var(--text-tertiary)" }}>
          No links match the current filter.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table-premium">
            <thead>
              <tr>
                <th className="w-8">#</th>
                <th>URL</th>
                <th>Anchor Text</th>
                <th>Status</th>
                <th>Code</th>
                <th>Est. Loss</th>
                <th>AI Suggestion</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((link, i) => {
                const rowNum = (page - 1) * PER_PAGE + i + 1;
                const isBroken = ["broken", "out_of_stock"].includes(link.status);
                return (
                  <tr
                    key={i}
                    className="group"
                    style={{
                      background: isBroken ? "rgba(239,68,68,0.025)" : undefined,
                    }}
                  >
                    <td className="w-8 font-nums text-[11px]" style={{ color: "var(--text-tertiary)" }}>{rowNum}</td>
                    <td>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-[11px] truncate max-w-[220px]" title={link.url}>
                          {link.url}
                        </span>
                        <CopyButton text={link.url} />
                        {link.final_url && link.final_url !== link.url && (
                          <a href={link.final_url} target="_blank" rel="noopener noreferrer"
                            className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
                            style={{ color: "var(--accent)" }}
                          >
                            <S.external />
                          </a>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="text-[11px] truncate max-w-[120px] block" title={link.anchor_text || "—"}>
                        {link.anchor_text || <span style={{ color: "var(--text-tertiary)" }}>—</span>}
                      </span>
                    </td>
                    <td><StatusBadge status={link.status} /></td>
                    <td>
                      <span className="font-nums text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                        {link.status_code ?? "—"}
                      </span>
                    </td>
                    <td>
                      {link.estimated_loss ? (
                        <span className="font-nums font-semibold text-[11px]" style={{ color: "var(--accent-orange)" }}>
                          {link.estimated_loss}
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-tertiary)" }}>—</span>
                      )}
                    </td>
                    <td>
                      {link.ai_suggestion ? (
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-lg font-semibold"
                          style={{ background: "var(--accent-green-bg)", color: "var(--accent-green)", border: "1px solid rgba(16,185,129,0.20)" }}
                          title={link.ai_suggestion}
                        >
                          💡 {truncate(link.ai_suggestion, 50)}
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-tertiary)", fontSize: "0.688rem" }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pageCount > 1 && (
        <div
          className="flex items-center justify-between px-5 py-3 border-t text-xs"
          style={{ borderColor: "var(--border-color)", background: "var(--bg-tertiary)" }}
        >
          <span style={{ color: "var(--text-tertiary)" }}>
            Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-30"
              style={{ background: "var(--bg-hover)", color: "var(--text-secondary)", border: "1px solid var(--border-color)" }}
            >
              Prev
            </button>
            {Array.from({ length: Math.min(pageCount, 5) }, (_, i) => {
              const pg = page <= 3 ? i + 1 : page - 2 + i;
              if (pg > pageCount) return null;
              return (
                <button
                  key={pg}
                  onClick={() => setPage(pg)}
                  className="w-7 h-7 rounded-lg text-[11px] font-bold transition-colors"
                  style={{
                    background: pg === page ? "var(--accent-gradient)" : "var(--bg-hover)",
                    color: pg === page ? "#fff" : "var(--text-secondary)",
                    border: pg === page ? "none" : "1px solid var(--border-color)",
                  }}
                >
                  {pg}
                </button>
              );
            })}
            <button
              disabled={page === pageCount}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-30"
              style={{ background: "var(--bg-hover)", color: "var(--text-secondary)", border: "1px solid var(--border-color)" }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Broken Links Highlight Card ──────────────────────────────────────────────

function BrokenLinksHighlight({ broken }: { broken: LinkResult[] }) {
  if (broken.length === 0) return null;
  return (
    <div
      className="rounded-2xl border p-4 animate-slideUp"
      style={{ background: "var(--accent-red-bg)", border: "1.5px solid rgba(239,68,68,0.25)" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(239,68,68,0.15)", color: "var(--accent-red)" }}
        >
          <S.zap />
        </div>
        <div>
          <div className="text-xs font-bold" style={{ color: "var(--accent-red)" }}>
            {broken.length} Critical Link{broken.length > 1 ? "s" : ""} Detected
          </div>
          <div className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
            Estimated loss: {formatINR(broken.length * 500)} / month
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {broken.slice(0, 5).map((link, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs"
            style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}
          >
            <StatusBadge status={link.status} />
            <span className="font-mono text-[11px] truncate flex-1" style={{ color: "var(--text-secondary)" }}>
              {link.url}
            </span>
            {link.estimated_loss && (
              <span className="shrink-0 font-bold font-nums text-[10px]" style={{ color: "var(--accent-orange)" }}>
                {link.estimated_loss}
              </span>
            )}
          </div>
        ))}
        {broken.length > 5 && (
          <div className="text-[10px] text-center pt-1" style={{ color: "var(--text-tertiary)" }}>
            + {broken.length - 5} more broken links in the full table below
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Scan Results — Web Page ──────────────────────────────────────────────────

function WebScanResults({ result }: { result: any }) {
  const allLinks: LinkResult[] = [
    ...(result.broken_links || []),
    ...(result.ok_links || []),
    ...(result.redirect_links || []),
  ];
  const broken: LinkResult[] = result.broken_links || [];
  const summary = result.summary || {};

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Total Links"
          value={<AnimatedCounter value={summary.total || 0} />}
          icon={<S.link />}
          delay={0}
        />
        <KpiCard
          label="Healthy"
          value={<AnimatedCounter value={summary.ok || 0} />}
          icon={<S.check />}
          accentColor="var(--accent-green)"
          accentBg="var(--accent-green-bg)"
          delay={80}
        />
        <KpiCard
          label="Broken / OOS"
          value={<AnimatedCounter value={summary.broken || 0} />}
          icon={<S.x />}
          accentColor="var(--accent-red)"
          accentBg="var(--accent-red-bg)"
          delay={160}
        />
        <KpiCard
          label="Est. Monthly Loss"
          value={formatINR(summary.estimated_monthly_loss_inr || 0)}
          icon={<S.arrowDown />}
          accentColor="var(--accent-orange)"
          accentBg="var(--accent-orange-bg)"
          delay={240}
        />
      </div>

      {/* Broken highlight strip */}
      <BrokenLinksHighlight broken={broken} />

      {/* Full filterable table */}
      {allLinks.length > 0 && (
        <LinkResultsTable
          links={allLinks}
          title="All Scanned Links"
          showBrokenHighlight={true}
        />
      )}
    </div>
  );
}

// ─── Scan Results — YouTube ───────────────────────────────────────────────────

function YouTubeScanResults({ result }: { result: any }) {
  const summary = result.summary || {};
  const channel = result.channel || {};

  const allLinks: LinkResult[] = Object.values(result.all_by_video || {}).flatMap((v: any) => v.links || []);
  const brokenLinks: LinkResult[] = Object.values(result.broken_by_video || {}).flatMap((v: any) => v.broken_links || []);

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Channel info */}
      <div
        className="rounded-2xl p-4 flex items-center gap-4"
        style={{ background: "var(--bg-card)", border: "1.5px solid var(--border-card)" }}
      >
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-rose-500"
          style={{ background: "rgba(239,68,68,0.08)", border: "1.5px solid rgba(239,68,68,0.20)" }}
        >
          <S.youtube />
        </div>
        <div>
          <div className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
            {channel.name || "Channel Details"}
          </div>
          <div className="text-xs font-mono" style={{ color: "var(--text-tertiary)" }}>
            @{channel.handle}
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard label="Videos Scanned"  value={<AnimatedCounter value={summary.videos_scanned || 0} />}       icon={<S.youtube />} delay={0} />
        <KpiCard label="Links Checked"   value={<AnimatedCounter value={summary.total_links_checked || 0} />}  icon={<S.link />}    delay={60} />
        <KpiCard label="Broken / OOS"    value={<AnimatedCounter value={summary.broken_links || 0} />}          icon={<S.x />}       accentColor="var(--accent-red)"    accentBg="var(--accent-red-bg)"    delay={120} />
        <KpiCard label="Healthy"         value={<AnimatedCounter value={summary.ok_links || 0} />}              icon={<S.check />}   accentColor="var(--accent-green)"  accentBg="var(--accent-green-bg)"  delay={180} />
        <KpiCard label="Est. Monthly Loss" value={formatINR(summary.estimated_monthly_loss_inr || 0)}           icon={<S.arrowDown />} accentColor="var(--accent-orange)" accentBg="var(--accent-orange-bg)" delay={240} />
      </div>

      {/* Broken highlight */}
      <BrokenLinksHighlight broken={brokenLinks} />

      {/* Full links table (all statuses) */}
      {allLinks.length > 0 ? (
        <LinkResultsTable links={allLinks} title="All Links Scanned Across Videos" showBrokenHighlight={false} />
      ) : brokenLinks.length > 0 ? (
        <LinkResultsTable links={brokenLinks} title="Broken Links Found" showBrokenHighlight={false} />
      ) : null}

      {/* Per-video accordion */}
      {Object.keys(result.all_by_video || {}).length > 0 && (
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ background: "var(--bg-card)", border: "1.5px solid var(--border-card)" }}
        >
          <div
            className="px-5 py-3.5 border-b font-bold text-xs"
            style={{ borderColor: "var(--border-color)", background: "var(--bg-tertiary)", color: "var(--text-primary)" }}
          >
            All Links by Video
          </div>
          {Object.entries(result.all_by_video || {}).map(([videoId, data]: [string, any]) => {
            const brokenCount = data.links.filter((l: any) => l.status === "broken" || l.status === "out_of_stock").length;
            return (
            <details key={videoId} className="border-b group" style={{ borderColor: "var(--border-color)" }}>
              <summary
                className="px-5 py-3.5 flex items-center justify-between cursor-pointer list-none select-none transition-colors"
                style={{ color: "var(--text-primary)" }}
              >
                <div className="flex-1 min-w-0 pr-4">
                  <div className="text-xs font-bold truncate">{data.title}</div>
                  <a
                    href={`https://youtu.be/${videoId}`}
                    target="_blank"
                    onClick={e => e.stopPropagation()}
                    className="text-[10px] inline-flex items-center gap-1 font-mono mt-0.5"
                    style={{ color: "var(--accent)" }}
                  >
                    youtu.be/{videoId} <S.external />
                  </a>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-lg"
                    style={{ background: brokenCount > 0 ? "var(--accent-red-bg)" : "var(--bg-hover)", color: brokenCount > 0 ? "var(--accent-red)" : "var(--text-secondary)", border: brokenCount > 0 ? "1px solid rgba(239,68,68,0.25)" : "1px solid var(--border-color)" }}
                  >
                    {data.links.length} links • {brokenCount} broken
                  </span>
                  <span style={{ color: "var(--text-tertiary)" }}><S.chevronDown /></span>
                </div>
              </summary>
              <div className="px-5 pb-4 pt-2 space-y-2 border-t" style={{ borderColor: "var(--border-color)", background: "var(--bg-hover)" }}>
                {data.links.map((link: any, i: number) => (
                  <div
                    key={i}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl text-xs"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <StatusBadge status={link.status} />
                      <span className="font-mono text-[11px] truncate" style={{ color: "var(--text-secondary)" }} title={link.url}>
                        {link.url}
                      </span>
                    </div>
                    {link.ai_suggestion && (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-lg font-semibold self-start sm:self-center whitespace-nowrap"
                        style={{ background: "var(--accent-green-bg)", color: "var(--accent-green)", border: "1px solid rgba(16,185,129,0.20)" }}
                      >
                        💡 {link.ai_suggestion}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )})}
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const { theme } = useTheme();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("home");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [selectedHistoryScan, setSelectedHistoryScan] = useState<ScanRecord | null>(null);
  const [scanTotal, setScanTotal] = useState(0);
  const [sites, setSites] = useState<MonitoredSite[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [siteUrl, setSiteUrl] = useState("");
  const [siteName, setSiteName] = useState("");
  const [addingSite, setAddingSite] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showAddSite, setShowAddSite] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Scan state
  const [inputMode, setInputMode] = useState<"url" | "youtube">("url");
  const [scanInput, setScanInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [ytResult, setYtResult] = useState<any>(null);
  const [videoCount, setVideoCount] = useState(5);

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const isDev = typeof window !== "undefined" && window.location.hostname === "localhost";

  // ── Toast helpers ─────────────────────────────────────────────────────────
  const addToast = useCallback((type: Toast["type"], message: string) => {
    const id = toastIdCounter++;
    setToasts(t => [...t, { id, type, message }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);
  const removeToast = useCallback((id: number) => setToasts(t => t.filter(x => x.id !== id)), []);

  // ── Auth ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    getSession().then(async (session) => {
      if (session?.user) {
        const meta = session.user.user_metadata;
        setUser({ id: session.user.id, email: session.user.email, full_name: meta?.full_name || "User", plan: "free" });
        await loadData(session.access_token);
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
    } catch (e) { log.error("Failed to load user data", e); } finally { setLoading(false); }
  }

  async function loadDevData() {
    setStats({ total_scans: 12, total_links_checked: 342, total_broken_found: 17, estimated_monthly_loss_inr: 8500, plan: "pro", monitored_sites_count: 2, last_scan_at: new Date().toISOString() });
    setScans([
      { id: "1", created_at: new Date().toISOString(), page_url: "https://myblog.com/best-laptops-2026", total_links: 42, broken_count: 3, ok_count: 36, redirect_count: 3, estimated_loss: 1500 },
      { id: "2", created_at: new Date(Date.now() - 86400000).toISOString(), page_url: "https://myblog.com/top-cameras", total_links: 28, broken_count: 1, ok_count: 25, redirect_count: 2, estimated_loss: 500 },
      { id: "3", created_at: new Date(Date.now() - 172800000).toISOString(), page_url: "https://myblog.com/protein-supplements", total_links: 55, broken_count: 7, ok_count: 44, redirect_count: 4, estimated_loss: 3500 },
    ]);
    setScanTotal(3);
    setLoading(false);
  }

  const getToken = useCallback(async () => (await getSession())?.access_token, []);

  // ── Scan ──────────────────────────────────────────────────────────────────

  async function runScan() {
    if (!scanInput.trim() || scanning) return;
    setScanning(true);
    setScanResult(null);
    setYtResult(null);
    try {
      const token = await getToken();
      const endpoint = inputMode === "youtube" ? "/api/check-youtube-channel" : "/api/check-links";
      const body = inputMode === "youtube"
        ? JSON.stringify({ channel_handle: scanInput, max_videos: videoCount, user_id: user?.id })
        : JSON.stringify({ links: [{ url: scanInput, anchor_text: scanInput, context: "" }], page_url: scanInput, user_id: user?.id });
      const res = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body,
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      if (inputMode === "youtube") {
        setYtResult(data);
        addToast("success", `Scanned ${data.summary?.videos_scanned || 0} videos. ${data.summary?.broken_links || 0} broken links found.`);
      } else {
        setScanResult(data);
        addToast("success", `Scan complete. ${data.summary?.broken || 0} broken links found.`);
      }
      
      // Append to history
      const newScan = {
        id: Math.random().toString(36).substring(2, 9),
        created_at: new Date().toISOString(),
        page_url: scanInput,
        total_links: inputMode === "youtube" ? data.summary?.total_links_checked || 0 : data.summary?.total || 0,
        broken_count: inputMode === "youtube" ? data.summary?.broken_links || 0 : data.summary?.broken || 0,
        ok_count: inputMode === "youtube" ? data.summary?.ok_links || 0 : data.summary?.ok || 0,
        redirect_count: inputMode === "youtube" ? data.summary?.redirect_links || 0 : data.summary?.redirects || 0,
        estimated_loss: data.summary?.estimated_monthly_loss_inr || 0,
      };
      setScans(prev => [newScan, ...prev]);
      
    } catch (e: any) {
      addToast("error", e.message || "Could not reach API. Make sure backend is running.");
      setScanResult({ error: e.message || "Could not reach API." });
    } finally { setScanning(false); }
  }

  // ── Sites ──────────────────────────────────────────────────────────────────

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
      addToast("success", "Site registered successfully.");
    } catch { addToast("error", "Failed to register site."); } finally { setAddingSite(false); }
  }

  async function deleteSite(id: string) {
    try {
      const token = await getToken();
      await fetch(`${API}/api/users/monitored-sites/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setSites(p => p.filter(s => s.id !== id));
      addToast("success", "Site removed.");
    } catch { addToast("error", "Failed to remove site."); }
  }

  // ── Nav ────────────────────────────────────────────────────────────────────

  const nav = [
    { id: "home",     icon: S.nav,     label: "Overview" },
    { id: "scanner",  icon: S.scan,    label: "Scanner" },
    { id: "history",  icon: S.history, label: "History" },
    { id: "sites",    icon: S.globe,   label: "Sites" },
    { id: "settings", icon: S.gear,    label: "Settings" },
  ];

  const planBadge = (p: string) => {
    const c: Record<string, { bg: string; color: string; border: string }> = {
      free:    { bg: "var(--bg-hover)",         color: "var(--text-tertiary)",   border: "var(--border-color)" },
      starter: { bg: "var(--accent-blue-bg)",   color: "var(--accent-blue)",    border: "rgba(59,130,246,0.25)" },
      pro:     { bg: "var(--accent-purple-bg)", color: "var(--accent-purple)",  border: "rgba(139,92,246,0.25)" },
      agency:  { bg: "var(--accent-orange-bg)", color: "var(--accent-orange)",  border: "rgba(245,158,11,0.25)" },
      admin:   { bg: "var(--accent-orange-bg)", color: "var(--accent-orange)",  border: "rgba(245,158,11,0.25)" },
    };
    return c[p] || c.free;
  };

  // ─── Loading Screen ────────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
      <div className="flex flex-col items-center gap-5">
        <div className="animate-float">{S.logo()}</div>
        <div
          className="w-5 h-5 border-2 rounded-full"
          style={{ borderColor: "var(--border-color)", borderTopColor: "var(--accent)", animation: "spin 0.8s linear infinite" }}
        />
        <span className="text-xs font-semibold" style={{ color: "var(--text-tertiary)" }}>Loading LinkGuardian.AI…</span>
      </div>
    </div>
  );

  const activeUser = user || { 
    id: "anonymous", 
    email: "guest@example.com", 
    full_name: "Guest User", 
    plan: "free" 
  };

  const currentPlan = stats?.plan || activeUser.plan || "free";

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* ─── Sidebar Desktop ─────────────────────────────────────────────────── */}
      <aside
        className="hidden md:flex w-64 flex-col shrink-0 border-r"
        style={{ background: "var(--sidebar-bg)", backdropFilter: "blur(24px)", borderColor: "var(--sidebar-border)" }}
      >
        {/* Logo */}
        <div className="p-6 border-b" style={{ borderColor: "var(--sidebar-border)" }}>
          <a href="/" className="flex items-center gap-2.5 group">
            <div className="transition-transform duration-300 group-hover:scale-105">{S.logo()}</div>
            <span className="font-extrabold text-sm tracking-tight" style={{ color: "var(--text-primary)" }}>
              LinkGuardian<span style={{ color: "var(--accent)" }}>.AI</span>
            </span>
          </a>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-4 space-y-1">
          {nav.map(item => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group"
                style={{
                  background: active ? "var(--bg-nav-active)" : "transparent",
                  color: active ? "var(--accent)" : "var(--text-secondary)",
                  border: active ? "1px solid var(--border-card)" : "1px solid transparent",
                }}
              >
                <span className="transition-transform duration-200 group-hover:scale-105">
                  {item.icon(active)}
                </span>
                {item.label}
                {active && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: "var(--accent)" }} />
                )}
              </button>
            );
          })}
        </nav>

        {/* Plan widget */}
        <div className="p-4 border-t" style={{ borderColor: "var(--sidebar-border)" }}>
          <div
            className="rounded-2xl p-4"
            style={{ background: "var(--gradient-sidebar-cta)", border: "1.5px solid var(--border-card)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full status-dot-live" />
              <span
                className="text-[9px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider"
                style={{ ...planBadge(currentPlan) }}
              >
                {currentPlan}
              </span>
            </div>
            <div className="text-[11px] mb-3 font-nums" style={{ color: "var(--text-tertiary)" }}>
              <span className="font-bold" style={{ color: "var(--text-primary)" }}>{stats?.total_scans || 0}</span> scans · {" "}
              <span className="font-bold" style={{ color: "var(--text-primary)" }}>{stats?.total_links_checked || 0}</span> links
            </div>
            {currentPlan === "free" && (
              <a href="/pricing" className="btn-primary block text-center text-[11px] py-2">
                Upgrade to Pro
              </a>
            )}
          </div>
        </div>
      </aside>

      {/* ─── Mobile Bottom Nav ─────────────────────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex border-t"
        style={{ background: "var(--sidebar-bg)", backdropFilter: "blur(24px)", borderColor: "var(--sidebar-border)" }}
      >
        {nav.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className="flex-1 flex flex-col items-center gap-1 py-3 text-[9px] font-bold transition-colors uppercase tracking-wider"
            style={{ color: activeTab === item.id ? "var(--accent)" : "var(--text-tertiary)" }}
          >
            {item.icon(activeTab === item.id)}
            {item.label}
          </button>
        ))}
      </nav>

      {/* ─── Main Content ──────────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 min-h-screen pb-24 md:pb-0 flex flex-col">

        {/* Sticky Header */}
        <header
          className="sticky top-0 z-40 border-b glass"
          style={{ borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center justify-between px-6 md:px-8 py-3.5">
            <div>
              <h1 className="text-sm font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>
                {nav.find(n => n.id === activeTab)?.label || "Dashboard"}
              </h1>
              <p className="text-[11px] hidden sm:block mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                {activeTab === "home"     && "Link health overview and recent scan activity."}
                {activeTab === "scanner"  && "Scan URLs or YouTube channels for broken affiliate links."}
                {activeTab === "history"  && "Full audit log of all previously initiated scans."}
                {activeTab === "sites"    && "Websites configured for automated background monitoring."}
                {activeTab === "settings" && "Account preferences and notification settings."}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all duration-200"
                  style={{ background: userMenuOpen ? "var(--bg-nav-active)" : "transparent" }}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: "var(--accent-gradient)" }}
                  >
                    {(activeUser.full_name || "U").charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-xs font-bold leading-none" style={{ color: "var(--text-primary)" }}>{activeUser.full_name}</div>
                    <div className="text-[9px] mt-0.5 uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>{currentPlan} plan</div>
                  </div>
                </button>
                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                    <div
                      className="absolute right-0 mt-2 w-52 rounded-2xl border shadow-xl z-20 overflow-hidden animate-scaleIn"
                      style={{ background: "var(--bg-card-glass)", backdropFilter: "blur(20px)", borderColor: "var(--border-card)" }}
                    >
                      <div className="px-4 py-3 border-b text-[10px] font-mono" style={{ borderColor: "var(--border-color)", color: "var(--text-tertiary)" }}>
                        {activeUser.email}
                      </div>
                      <a href="/pricing" className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-colors hover:bg-[var(--bg-hover)]" style={{ color: "var(--text-secondary)" }}>
                        <S.plus /> Upgrade Plan
                      </a>
                      <button
                        onClick={async () => { await signOut(); window.location.href = "/login"; }}
                        className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-t transition-colors hover:bg-[var(--bg-hover)]"
                        style={{ color: "var(--accent-red)", borderColor: "var(--border-color)" }}
                      >
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

          {/* ════ OVERVIEW ════ */}
          {activeTab === "home" && (
            <div className="space-y-6 animate-fadeIn">
              {/* Hero prompt card */}
              <div
                className="rounded-2xl p-6 md:p-8 relative overflow-hidden"
                style={{
                  background: "var(--bg-card-glass)",
                  backdropFilter: "blur(20px)",
                  border: "1.5px solid var(--border-card)",
                  boxShadow: "var(--shadow-lg)",
                }}
              >
                {/* Glow orb */}
                <div
                  className="absolute -top-12 -right-12 w-40 h-40 rounded-full pointer-events-none"
                  style={{ background: "radial-gradient(circle, rgba(108,71,255,0.15) 0%, transparent 70%)", filter: "blur(30px)" }}
                />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center"
                      style={{ background: "var(--accent-light)", color: "var(--accent)" }}
                    >
                      <S.shield />
                    </div>
                    <span className="text-xs font-bold" style={{ color: "var(--accent)" }}>LinkGuardian.AI</span>
                  </div>
                  <h2 className="text-lg md:text-xl font-extrabold mb-2" style={{ color: "var(--text-primary)" }}>
                    Protect your affiliate revenue
                  </h2>
                  <p className="text-xs mb-5 max-w-lg leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    Find broken product links, outdated redirect pathways, and Amazon out-of-stock listings before they impact your commissions.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button onClick={() => { setActiveTab("scanner"); setInputMode("url"); }} className="btn-primary text-xs">
                      <S.link /> Scan Web Page
                    </button>
                    <button onClick={() => { setActiveTab("scanner"); setInputMode("youtube"); }} className="btn-secondary text-xs">
                      <S.youtube /> Scan YouTube Channel
                    </button>
                  </div>
                </div>
              </div>

              {/* KPI Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard label="Links Checked"   value={<AnimatedCounter value={stats?.total_links_checked || 0} />}        icon={<S.link />}    delay={0}   />
                <KpiCard label="Broken Found"    value={<AnimatedCounter value={stats?.total_broken_found || 0} />}          icon={<S.x />}       accentColor="var(--accent-red)"    accentBg="var(--accent-red-bg)"    delay={80}  />
                <KpiCard label="Sites Monitored" value={<AnimatedCounter value={stats?.monitored_sites_count || 0} />}       icon={S.globe(false)} delay={160} />
                <KpiCard label="Monthly Loss"    value={formatINR(stats?.estimated_monthly_loss_inr || 0)}                   icon={<S.arrowDown />} accentColor="var(--accent-orange)" accentBg="var(--accent-orange-bg)" delay={240} />
              </div>

              {/* Recent Scans */}
              <div
                className="rounded-2xl border overflow-hidden"
                style={{ background: "var(--bg-card)", border: "1.5px solid var(--border-card)" }}
              >
                <div
                  className="flex items-center justify-between px-5 py-4 border-b"
                  style={{ borderColor: "var(--border-color)", background: "var(--bg-tertiary)" }}
                >
                  <h2 className="font-bold text-xs" style={{ color: "var(--text-primary)" }}>Recent Scans</h2>
                  <button
                    onClick={() => setActiveTab("history")}
                    className="text-xs font-semibold flex items-center gap-1 transition-colors hover:opacity-75"
                    style={{ color: "var(--accent)" }}
                  >
                    View All <S.chevronRight />
                  </button>
                </div>
                {scans.length === 0 ? (
                  <EmptyState icon={S.scan(false)} title="No scans yet" desc="Run your first page or channel link audit to populate the dashboard." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table-premium">
                      <thead>
                        <tr>
                          <th>Page</th>
                          <th>Links</th>
                          <th>Broken</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scans.slice(0, 5).map((s) => (
                          <tr key={s.id}>
                            <td className="font-mono truncate max-w-[200px] md:max-w-xs text-[11px]" title={s.page_url}>{truncate(s.page_url, 45)}</td>
                            <td className="font-nums">{s.total_links}</td>
                            <td className="font-nums font-bold" style={{ color: s.broken_count > 0 ? "var(--accent-red)" : "var(--accent-green)" }}>{s.broken_count}</td>
                            <td className="font-mono text-[11px]">{formatDate(s.created_at)}</td>
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
            <div className="space-y-5 animate-fadeIn">
              {/* Mode toggle */}
              <div
                className="flex gap-1 p-1 rounded-xl w-fit"
                style={{ background: "var(--bg-tertiary)", border: "1.5px solid var(--border-card)" }}
              >
                {(["url", "youtube"] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => { setInputMode(m); setScanResult(null); setYtResult(null); }}
                    className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all duration-200"
                    style={{
                      background: inputMode === m ? "var(--accent-gradient)" : "transparent",
                      color: inputMode === m ? "#fff" : "var(--text-secondary)",
                      boxShadow: inputMode === m ? "0 4px 16px rgba(108,71,255,0.30)" : "none",
                    }}
                  >
                    {m === "url" ? <S.link /> : <S.youtube />}
                    {m === "url" ? "Web Page" : "YouTube Channel"}
                  </button>
                ))}
              </div>

              {/* Input card */}
              <div
                className="rounded-2xl p-5 md:p-6"
                style={{ background: "var(--bg-card-glass)", backdropFilter: "blur(16px)", border: "1.5px solid var(--border-card)", boxShadow: "var(--shadow-card)" }}
              >
                <h2 className="font-bold text-sm mb-1.5" style={{ color: "var(--text-primary)" }}>
                  {inputMode === "url" ? "Scan a Web Page" : "Scan a YouTube Channel"}
                </h2>
                <p className="text-xs mb-5 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {inputMode === "url"
                    ? "Specify a target URL to check all outgoing links. Ideal for product reviews, blogs, and landing pages."
                    : "Enter a public YouTube channel handle or URL to scan video descriptions for dead affiliate links."}
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-tertiary)" }}>
                      {inputMode === "url" ? <S.link /> : <S.youtube />}
                    </span>
                    <input
                      value={scanInput}
                      onChange={e => setScanInput(e.target.value)}
                      placeholder={inputMode === "url" ? "https://example.com/your-review-page" : "@ChannelHandle or channel URL"}
                      className="input-premium pl-10"
                      onKeyDown={e => e.key === "Enter" && runScan()}
                    />
                  </div>
                  <button
                    onClick={runScan}
                    disabled={scanning || !scanInput.trim()}
                    className="btn-primary px-6 py-3 shrink-0"
                  >
                    {scanning ? (
                      <span
                        className="w-4 h-4 border-2 rounded-full"
                        style={{ borderColor: "rgba(255,255,255,0.30)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite" }}
                      />
                    ) : S.scan(false)}
                    {scanning ? "Scanning…" : "Scan Now"}
                  </button>
                </div>

                {/* YouTube video count selector */}
                {inputMode === "youtube" && (
                  <VideoCountSelector
                    value={videoCount}
                    onChange={setVideoCount}
                    plan={currentPlan}
                  />
                )}
              </div>

              {/* Web scan results */}
              {scanResult && !scanResult.error && <WebScanResults result={scanResult} />}

              {/* YouTube results */}
              {ytResult && !ytResult.error && <YouTubeScanResults result={ytResult} />}

              {/* Error */}
              {(scanResult?.error || ytResult?.error) && (
                <div
                  className="rounded-2xl p-5 flex items-start gap-3.5 animate-fadeIn"
                  style={{ background: "var(--accent-red-bg)", border: "1.5px solid rgba(239,68,68,0.25)" }}
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "rgba(239,68,68,0.15)", color: "var(--accent-red)" }}
                  >
                    <S.x />
                  </div>
                  <div>
                    <div className="font-bold text-xs" style={{ color: "var(--accent-red)" }}>Scan Failed</div>
                    <div className="text-[11px] mt-1" style={{ color: "var(--text-secondary)" }}>
                      {scanResult?.error || ytResult?.error}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════ HISTORY ════ */}
          {activeTab === "history" && (
            <div className="animate-fadeIn">
              {selectedHistoryScan ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <button onClick={() => setSelectedHistoryScan(null)} className="btn-secondary text-xs">
                      <S.chevronDown /> Back to History
                    </button>
                    <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Scan Details: {selectedHistoryScan.page_url}</h3>
                  </div>
                  
                  {/* Re-construct links for LinkResultsTable */}
                  <LinkResultsTable 
                    title="All Checked Links" 
                    showBrokenHighlight={true}
                    links={[
                      ...(selectedHistoryScan.broken_links_data || []),
                      ...(selectedHistoryScan.ok_links_data || []),
                      ...(selectedHistoryScan.redirect_links_data || []),
                      ...(selectedHistoryScan.unverifiable_links_data || [])
                    ]} 
                  />
                </div>
              ) : (
                <div
                  className="rounded-2xl border overflow-hidden"
                  style={{ background: "var(--bg-card)", border: "1.5px solid var(--border-card)" }}
                >
                  {scans.length === 0 ? (
                    <EmptyState icon={S.history(false)} title="No Scans Yet" desc="Initiated scan histories will appear here." />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="table-premium">
                        <thead>
                          <tr>
                            {["Target Page", "Total Links", "OK", "Broken", "Redirect", "Est. Loss", "Date", "Action"].map(h => (
                              <th key={h}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {scans.map(s => (
                            <tr key={s.id}>
                              <td className="font-mono text-[11px] truncate max-w-[200px]" title={s.page_url}>{truncate(s.page_url, 40)}</td>
                              <td className="font-nums">{s.total_links}</td>
                              <td className="font-nums" style={{ color: "var(--accent-green)" }}>{s.ok_count}</td>
                              <td>
                                <span className="font-nums font-bold" style={{ color: s.broken_count > 0 ? "var(--accent-red)" : "var(--accent-green)" }}>
                                  {s.broken_count}
                                </span>
                              </td>
                              <td className="font-nums" style={{ color: "var(--accent-blue)" }}>{s.redirect_count}</td>
                              <td className="font-nums font-bold" style={{ color: "var(--accent-orange)" }}>{formatINR(s.estimated_loss)}</td>
                              <td className="font-mono text-[11px]">{formatDate(s.created_at)}</td>
                              <td>
                                <button 
                                  onClick={() => setSelectedHistoryScan(s)}
                                  className="text-[10px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors"
                                  style={{ background: "var(--accent-light)", color: "var(--accent)" }}
                                >
                                  View Details
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ════ SITES ════ */}
          {activeTab === "sites" && (
            <div className="space-y-5 animate-fadeIn">
              {showAddSite && (
                <div
                  className="rounded-2xl p-5 animate-scaleIn"
                  style={{ background: "var(--bg-card-glass)", backdropFilter: "blur(16px)", border: "1.5px solid var(--border-card)" }}
                >
                  <h3 className="font-bold text-xs uppercase tracking-wider mb-3" style={{ color: "var(--text-primary)" }}>
                    Register New Website
                  </h3>
                  <div className="flex flex-col sm:flex-row gap-2.5 mb-4">
                    <input
                      value={siteName}
                      onChange={e => setSiteName(e.target.value)}
                      placeholder="Friendly Label (optional)"
                      className="input-premium sm:w-44 text-xs"
                    />
                    <input
                      value={siteUrl}
                      onChange={e => setSiteUrl(e.target.value)}
                      placeholder="https://yoursite.com"
                      className="input-premium flex-1 text-xs"
                      onKeyDown={e => e.key === "Enter" && addSite()}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={addSite} disabled={addingSite || !siteUrl.trim()} className="btn-primary text-xs">
                      {addingSite ? "Registering…" : "Register Website"}
                    </button>
                    <button onClick={() => setShowAddSite(false)} className="btn-secondary text-xs">Cancel</button>
                  </div>
                </div>
              )}

              {!showAddSite && (
                <button onClick={() => setShowAddSite(true)} className="btn-primary text-xs">
                  <S.plus /> Register Site
                </button>
              )}

              {sites.length === 0 && !showAddSite ? (
                <div style={{ background: "var(--bg-card)", border: "1.5px solid var(--border-card)", borderRadius: "1rem", overflow: "hidden" }}>
                  <EmptyState icon={S.globe(false)} title="No Sites Registered" desc="Register your websites to initiate automated background link monitoring." />
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {sites.map(site => (
                    <div
                      key={site.id}
                      className="glass-card rounded-2xl p-4 flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{
                            background: site.is_active ? "var(--accent-green-bg)" : "var(--bg-hover)",
                            color: site.is_active ? "var(--accent-green)" : "var(--text-tertiary)",
                            border: site.is_active ? "1px solid rgba(16,185,129,0.25)" : "1px solid var(--border-card)",
                          }}
                        >
                          {S.globe(false)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs truncate" style={{ color: "var(--text-primary)" }}>
                              {site.name || site.url}
                            </span>
                            {site.is_active && (
                              <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: "var(--accent-green)" }} />
                            )}
                          </div>
                          <div className="text-[10px] font-mono truncate mt-0.5" style={{ color: "var(--text-tertiary)" }}>{site.url}</div>
                          {site.last_scanned_at && (
                            <div className="text-[10px] mt-1" style={{ color: "var(--text-tertiary)" }}>
                              Last scanned: {formatDate(site.last_scanned_at)}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteSite(site.id)}
                        className="p-2 rounded-xl transition-all opacity-0 group-hover:opacity-100 hover:bg-[var(--accent-red-bg)]"
                        style={{ color: "var(--text-tertiary)" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "var(--accent-red)")}
                        onMouseLeave={e => (e.currentTarget.style.color = "var(--text-tertiary)")}
                      >
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
            <div className="max-w-xl space-y-4 animate-fadeIn">
              {/* Appearance */}
              <div
                className="rounded-2xl p-5"
                style={{ background: "var(--bg-card)", border: "1.5px solid var(--border-card)" }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Visual Appearance</div>
                    <div className="text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                      {theme === "dark" ? "Dark mode — Deep Space theme" : "Light mode — Warm Purple theme"}
                    </div>
                  </div>
                  <ThemeToggle />
                </div>
              </div>

              {/* Alerts */}
              <div
                className="rounded-2xl border overflow-hidden"
                style={{ background: "var(--bg-card)", border: "1.5px solid var(--border-card)" }}
              >
                <div
                  className="px-5 py-3.5 border-b"
                  style={{ borderColor: "var(--border-color)", background: "var(--bg-tertiary)" }}
                >
                  <h3 className="font-bold text-xs uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
                    Alert Configurations
                  </h3>
                </div>
                {[
                  { key: "email_alerts", label: "Email Notifications", desc: "Alert me immediately when monitored links fail." },
                  { key: "weekly_report", label: "Weekly Audit Digest", desc: "Compile a weekly summary of portfolio link health." },
                ].map((item, idx) => {
                  const val = settings ? (settings as any)[item.key] : false;
                  return (
                    <div
                      key={item.key}
                      className={cn("flex items-center justify-between px-5 py-4", idx > 0 ? "border-t" : "")}
                      style={{ borderColor: "var(--border-color)" }}
                    >
                      <div className="pr-4">
                        <div className="font-bold text-xs" style={{ color: "var(--text-primary)" }}>{item.label}</div>
                        <div className="text-[10px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>{item.desc}</div>
                      </div>
                      <ToggleSwitch value={val} onChange={v => {
                        setSettings(p => p ? { ...p, [item.key]: v } : p);
                        getToken().then(t => {
                          if (t) fetch(`${API}/api/users/settings`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
                            body: JSON.stringify({ [item.key]: v }),
                          });
                        });
                      }} />
                    </div>
                  );
                })}
              </div>

              {/* Account */}
              <div
                className="rounded-2xl p-5"
                style={{ background: "var(--bg-card)", border: "1.5px solid var(--border-card)" }}
              >
                <h3 className="font-bold text-xs uppercase tracking-wider mb-4" style={{ color: "var(--text-primary)" }}>
                  Account Properties
                </h3>
                <div
                  className="flex items-center gap-3.5 p-3.5 rounded-xl mb-5"
                  style={{ background: "var(--bg-hover)", border: "1px solid var(--border-card)" }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-extrabold text-white shrink-0"
                    style={{ background: "var(--accent-gradient)" }}
                  >
                    {(activeUser.full_name || "U").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm truncate" style={{ color: "var(--text-primary)" }}>{activeUser.full_name}</div>
                    <div className="text-[10px] font-mono truncate" style={{ color: "var(--text-tertiary)" }}>{activeUser.email}</div>
                  </div>
                  <span
                    className="text-[9px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider shrink-0"
                    style={planBadge(currentPlan)}
                  >
                    {currentPlan}
                  </span>
                </div>
                <div className="flex gap-2">
                  {currentPlan === "free" && (
                    <a href="/pricing" className="btn-primary text-xs">Upgrade Account</a>
                  )}
                  <button
                    onClick={async () => { await signOut(); window.location.href = "/login"; }}
                    className="btn-secondary text-xs"
                    style={{ color: "var(--accent-red)", borderColor: "rgba(239,68,68,0.25)" }}
                  >
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
