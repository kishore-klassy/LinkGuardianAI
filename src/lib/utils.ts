export const LOG = "[ExpireLinkX]";

export const log = {
  info: (msg: string, ...args: unknown[]) => console.log(`${LOG} ℹ️  ${msg}`, ...args),
  warn: (msg: string, ...args: unknown[]) => console.warn(`${LOG} ⚠️  ${msg}`, ...args),
  error: (msg: string, ...args: unknown[]) => console.error(`${LOG} 🔴 ${msg}`, ...args),
  debug: (msg: string, ...args: unknown[]) => console.debug(`${LOG} 🔍 ${msg}`, ...args),
  success: (msg: string, ...args: unknown[]) => console.log(`${LOG} ✅ ${msg}`, ...args),
  step: (msg: string, ...args: unknown[]) => console.log(`${LOG} ▸ ${msg}`, ...args),
  api: (method: string, url: string, status?: number) => {
    const icon = status ? (status >= 400 ? "🔴" : "✅") : "➡️";
    console.log(`${LOG} ${icon} ${method} ${url}${status ? ` → ${status}` : ""}`);
  },
};

export function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

export function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function truncate(str: string, length: number) {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

export function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    broken: "BROKEN",
    out_of_stock: "OUT OF STOCK",
    timeout: "TIMEOUT",
    redirect: "REDIRECT",
    ok: "HEALTHY",
    error: "ERROR",
    skipped: "SKIPPED",
  };
  return labels[status] || status.toUpperCase();
}
