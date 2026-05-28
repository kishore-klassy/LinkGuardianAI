// ExpireLinkX - Background Service Worker
import { Logger } from "./logger.js";

const PROD_API = "https://api.expirelinkx.com";
const DEV_API = "http://localhost:8000";

// Allow overriding API base from extension UI/storage (so it works behind tunnels, custom hosts, etc.)
async function getApiBase() {
  try {
    const stored = await new Promise((resolve) => {
      chrome.storage.local.get(["api_base"], (data) => resolve(data));
    });
    if (stored?.api_base) return stored.api_base;
  } catch (_) {}

  // Use localhost when unpacked (development), production otherwise
  if (chrome.runtime.getManifest().update_url === undefined) {
    return DEV_API;
  }
  return PROD_API;
}




// ─── Core API Call ────────────────────────────────────────────────────────────

async function checkLinks(links, pageUrl, userId) {
  try {
    const base = await getApiBase();
    Logger.info(`Sending ${links.length} links to API: ${base}/api/check-links`);
    const response = await fetch(`${base}/api/check-links`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(userId ? { "X-User-ID": userId } : {}),
      },
      body: JSON.stringify({
        links,
        page_url: pageUrl,
        user_id: userId,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    Logger.success(`Scan complete: ${data.summary?.broken || 0} broken out of ${data.summary?.total || 0} total`);
    return data;
  } catch (err) {
    Logger.error(`API call failed: ${err.message}`);
    throw err;
  }
}

// ─── Storage Helpers ─────────────────────────────────────────────────────────

async function getUser() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["user", "subscription"], (data) => {
      resolve(data);
    });
  });
}

async function saveScanResult(pageUrl, result) {
  const key = `scan_${Date.now()}`;
  const entry = { pageUrl, result, timestamp: Date.now() };
  chrome.storage.local.set({ [key]: entry });

  // Keep only last 20 scans
  chrome.storage.local.get(null, (items) => {
    const scanKeys = Object.keys(items)
      .filter((k) => k.startsWith("scan_"))
      .sort()
      .reverse();
    const toDelete = scanKeys.slice(20);
    if (toDelete.length > 0) {
      chrome.storage.local.remove(toDelete);
    }
  });
}

async function getScanHistory() {
  return new Promise((resolve) => {
    chrome.storage.local.get(null, (items) => {
      const scans = Object.entries(items)
        .filter(([k]) => k.startsWith("scan_"))
        .map(([, v]) => v)
        .sort((a, b) => b.timestamp - a.timestamp);
      resolve(scans);
    });
  });
}

// ─── Free Tier Limits ─────────────────────────────────────────────────────────

const DEV_ADMIN_EMAIL = "admin@expirelinkx.dev";

async function checkScanLimit() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["scan_count", "scan_date", "user", "dev_admin"], (data) => {
      const today = new Date().toDateString();
      const { user } = data;

      // Dev admin bypass — unlimited scans
      if (data.dev_admin === true) {
        resolve({ allowed: true, remaining: Infinity, dev_admin: true });
        return;
      }

      // Auto-detect admin email
      if (user?.email === DEV_ADMIN_EMAIL) {
        chrome.storage.local.set({ dev_admin: true });
        resolve({ allowed: true, remaining: Infinity, dev_admin: true });
        return;
      }

      // Paid users have unlimited scans
      if (user?.subscription === "pro" || user?.subscription === "agency") {
        resolve({ allowed: true, remaining: Infinity });
        return;
      }

      // Free users: 3 full scans per day
      let count = data.scan_count || 0;
      if (data.scan_date !== today) {
        count = 0;
      }

      const FREE_LIMIT = 20;
      resolve({
        allowed: count < FREE_LIMIT,
        remaining: FREE_LIMIT - count,
        count,
        limit: FREE_LIMIT,
      });
    });
  });
}

async function incrementScanCount() {
  const today = new Date().toDateString();
  chrome.storage.local.get(["scan_count", "scan_date", "dev_admin"], (data) => {
    if (data.dev_admin) return; // Don't count admin scans
    const count =
      data.scan_date === today ? (data.scan_count || 0) + 1 : 1;
    chrome.storage.local.set({ scan_count: count, scan_date: today });
  });
}

// ─── Message Handler ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.action === "CHECK_LINKS") {
    const { links, pageUrl } = message;

    (async () => {
      try {
        // Check free tier limit
        const limit = await checkScanLimit();
        if (!limit.allowed) {
      Logger.warn(`Scan blocked: free limit reached (${limit.limit}/day)`);
      sendResponse({
        success: false,
        error: "FREE_LIMIT_REACHED",
        message: `You've used your ${limit.limit} free scans for today. Upgrade to Pro for unlimited scans.`,
      });
          return;
        }

        const { user } = await getUser();
        Logger.step(`Checking ${links.length} links from: ${pageUrl}`);
        const results = await checkLinks(links, pageUrl, user?.id);

        await incrementScanCount();
        await saveScanResult(pageUrl, results);

        // Persist latest result so popup shows it on reopen
        chrome.storage.local.set({ last_scan: { pageUrl, results, timestamp: Date.now() } });

        // Show badge with broken count
        const broken = results?.summary?.broken || 0;
        if (broken > 0) {
          chrome.action.setBadgeText({ text: String(broken) });
          chrome.action.setBadgeBackgroundColor({ color: "#ff3b30" });
        } else {
          chrome.action.setBadgeText({ text: "✓" });
          chrome.action.setBadgeBackgroundColor({ color: "#30d158" });
        }

        // Notify user of completion (only if significant)
        if (broken > 0) {
          chrome.notifications.create({
            type: "basic",
            iconUrl: "icons/icon48.svg",
            title: "ExpireLinkX — Scan Complete",
            message: `Found ${broken} broken link${broken > 1 ? "s" : ""} on ${new URL(pageUrl).hostname || pageUrl}. Est. loss: ₹${results.summary?.estimated_monthly_loss_inr || 0}/month`,
          });
        }

        sendResponse({ success: true, results });
      } catch (err) {
        Logger.error(`CHECK_LINKS failed: ${err.message}`);
        sendResponse({
          success: false,
          error: "API_ERROR",
          message: err.message,
        });
      }
    })();

    return true; // Keep message channel open for async
  }

  if (message.action === "GET_SCAN_HISTORY") {
    (async () => {
      const history = await getScanHistory();
      sendResponse({ history });
    })();
    return true;
  }

  if (message.action === "GET_SCAN_LIMIT") {
    (async () => {
      const limit = await checkScanLimit();
      sendResponse(limit);
    })();
    return true;
  }

  if (message.action === "GET_LAST_SCAN") {
    chrome.storage.local.get(["last_scan"], (data) => {
      sendResponse(data.last_scan || null);
    });
    return true;
  }

  if (message.action === "CLEAR_BADGE") {
    chrome.action.setBadgeText({ text: "" });
    sendResponse({ success: true });
    return true;
  }

  if (message.action === "SAVE_USER") {
    chrome.storage.local.set({ user: message.user });
    sendResponse({ success: true });
    return true;
  }

  if (message.action === "GET_USER") {
    chrome.storage.local.get(["user"], (data) => {
      sendResponse({ user: data.user || null });
    });
    return true;
  }

  if (message.action === "LOGOUT") {
    chrome.storage.local.remove(["user", "dev_admin"]);
    sendResponse({ success: true });
    return true;
  }

  if (message.action === "SET_DEV_ADMIN") {
    const enabled = message.enabled === true;
    chrome.storage.local.set({ dev_admin: enabled });
    sendResponse({ success: true, dev_admin: enabled });
    return true;
  }

  if (message.action === "GET_DEV_ADMIN") {
    chrome.storage.local.get(["dev_admin"], (data) => {
      sendResponse({ dev_admin: data.dev_admin === true });
    });
    return true;
  }
});

// ─── Periodic Monitoring (Pro feature) ───────────────────────────────────────

chrome.alarms.create("weekly-monitor", {
  periodInMinutes: 60 * 24 * 7, // Once a week
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "weekly-monitor") return;

  const { user } = await getUser();
  if (!user || user.subscription === "free") return;

  // TODO: Trigger background crawl via API for monitored domains
  // This would call /api/monitor/run for the user's registered sites

  chrome.notifications.create({
    type: "basic",
      iconUrl: "icons/icon48.svg",
    title: "ExpireLinkX — Weekly Report Ready",
    message: "Your weekly link health report is ready. Click to view.",
  });
});

// ─── Install Handler ─────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener((details) => {
  Logger.info(`Extension ${details.reason === "install" ? "installed" : "updated"} (v${chrome.runtime.getManifest().version})`);
  if (details.reason === "install") {
    chrome.tabs.create({
      url: "https://expirelinkx.com/welcome?source=extension", // Change to your domain
    });
    chrome.storage.local.set({
      scan_count: 0,
      scan_date: new Date().toDateString(),
      onboarded: false,
    });
    Logger.step("Initial scan count set to 0");
  }
  Logger.success("Background service worker ready");
});
