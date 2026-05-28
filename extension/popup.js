// ExpireLinkX - Popup Script
const LOG = "[ExpireLinkX:Popup]";

async function getAppUrl() {
  // Allow override via storage (set from options page or dev tools)
  try {
    const stored = await new Promise((resolve) => {
      chrome.storage.local.get(["app_base"], (data) => resolve(data));
    });
    if (stored?.app_base) return stored.app_base;
  } catch (_) {}
  // Auto-detect: unpacked → localhost, packed → production
  if (chrome.runtime.getManifest().update_url === undefined) {
    return "http://localhost:3000";
  }
  return "https://expirelinkx.com";
}

document.addEventListener("DOMContentLoaded", async () => {
  // Fix external links for dev/prod
  const appUrl = await getAppUrl();
  document.getElementById("signin-link")?.setAttribute("href", appUrl + "/login?source=extension");
  document.getElementById("dashboard-link")?.setAttribute("href", appUrl + "/dashboard?source=extension");

  // ─── State ────────────────────────────────────────────────────────────────
  let currentTab = null;
  let scanResults = null;
  let overlaysShown = false;

  // ─── DOM refs ────────────────────────────────────────────────────────────
  const scanBtn = document.getElementById("scan-btn");
  const scanText = document.getElementById("scan-text");
  const scanIcon = document.getElementById("scan-icon");
  const progressWrap = document.getElementById("progress-wrap");
  const progressBar = document.getElementById("progress-bar");
  const emptyState = document.getElementById("empty-state");
  const resultsSection = document.getElementById("results-section");
  const countBroken = document.getElementById("count-broken");
  const countOk = document.getElementById("count-ok");
  const countTotal = document.getElementById("count-total");
  const lossBanner = document.getElementById("loss-banner");
  const lossAmount = document.getElementById("loss-amount");
  const resultsList = document.getElementById("results-list");
  const toggleOverlaysBtn = document.getElementById("toggle-overlays");
  const upgradeBanner = document.getElementById("upgrade-banner");
  const pageDomain = document.getElementById("page-domain");
  const planBadge = document.getElementById("plan-badge");
  const scansLeftText = document.getElementById("scans-left-text");

  // ─── Init ─────────────────────────────────────────────────────────────────

  console.log(`${LOG} 🚀 Popup opened`);

  // Get active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  if (tab?.url) {
    try {
      const host = new URL(tab.url).hostname;
      pageDomain.textContent = host;
      console.log(`${LOG} ▸ Active tab: ${host}`);
    } catch {
      pageDomain.textContent = tab.url.slice(0, 30);
    }
  } else {
    console.log(`${LOG} ⚠️ No active tab URL`);
  }

  // Load user & scan limits
  await refreshUserState();
  await refreshScanLimit();

  // Load last scan results (if any) so user sees them even after popup reopens
  chrome.runtime.sendMessage({ action: "GET_LAST_SCAN" }, (lastScan) => {
    if (lastScan?.results) {
      scanResults = lastScan.results;
      renderResults(lastScan.results);
    }
  });
  // Clear badge when popup opens
  chrome.runtime.sendMessage({ action: "CLEAR_BADGE" });

  // ─── Tab Navigation ───────────────────────────────────────────────────────

  document.querySelectorAll(".tab").forEach((tabEl) => {
    tabEl.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      tabEl.classList.add("active");

      const viewName = tabEl.dataset.tab;
      document.querySelectorAll('[id^="view-"]').forEach((v) => v.classList.add("hidden"));
      document.getElementById(`view-${viewName}`).classList.remove("hidden");

      if (viewName === "history") loadHistory();
      if (viewName === "account") loadAccount();
    });
  });

  // ─── Scan Logic ───────────────────────────────────────────────────────────

  scanBtn.addEventListener("click", async () => {
    if (!currentTab?.id || !currentTab?.url) {
      console.warn(`${LOG} ⚠️ No active tab`);
      return;
    }

    if (!currentTab.url.startsWith("http")) {
      console.warn(`${LOG} ⚠️ Cannot scan non-http page: ${currentTab.url.slice(0, 50)}`);
      showToast("Can only scan web pages (http/https).");
      return;
    }

    console.log(`${LOG} 🖱️ Scan clicked for: ${currentTab.url}`);

    const limit = await new Promise((res) =>
      chrome.runtime.sendMessage({ action: "GET_SCAN_LIMIT" }, res)
    );

    if (!limit.allowed) {
      console.warn(`${LOG} ⚠️ Scan limit reached (${limit.count}/${limit.limit})`);
      showUpgradeBanner();
      return;
    }

    console.log(`${LOG} ✅ Scan limit OK, starting scan...`);
    await startScan();
  });

  async function startScan() {
    console.log(`${LOG} ▸ Starting scan...`);
    scanBtn.disabled = true;
    scanBtn.classList.add("scanning");
    scanText.textContent = "Extracting links…";
    scanIcon.textContent = "⏳";
    progressWrap.classList.add("visible");
    animateProgress(0, 30, 800);
    emptyState.classList.add("hidden");
    resultsSection.classList.add("hidden");
    upgradeBanner.classList.add("hidden");

    try {
      // Step 1: Extract links from the page
      let extracted;
      try {
        console.log(`${LOG} ▸ Sending EXTRACT_LINKS to tab ${currentTab.id}`);
        extracted = await new Promise((res, rej) => {
          chrome.tabs.sendMessage(
            currentTab.id,
            { action: "EXTRACT_LINKS" },
            (response) => {
              if (chrome.runtime.lastError) rej(new Error(chrome.runtime.lastError.message));
              else res(response);
            }
          );
        });
        console.log(`${LOG} ✅ Extracted ${extracted?.links?.length || 0} links`);
      } catch (e) {
        console.warn(`${LOG} ⚠️ Content script not found:`, e.message);
        throw new Error(
          "Extension not loaded on this page yet. Please reload the page and try again."
        );
      }

      if (!extracted?.links?.length) {
        console.log(`${LOG} ℹ️ No external links found on page`);
        resetScanBtn();
        showToast("No external links found on this page.");
        emptyState.classList.remove("hidden");
        return;
      }

      scanText.textContent = `Checking ${extracted.links.length} links…`;
      animateProgress(30, 70, 1500);

      // Step 2: Send to background for API check
      console.log(`${LOG} ▸ Sending ${extracted.links.length} links to background for API check`);
      const result = await new Promise((res, rej) => {
        chrome.runtime.sendMessage(
          {
            action: "CHECK_LINKS",
            links: extracted.links,
            pageUrl: extracted.page_url,
          },
          (response) => {
            if (chrome.runtime.lastError) rej(new Error(chrome.runtime.lastError.message));
            else res(response);
          }
        );
      });

      animateProgress(70, 100, 400);

      if (!result.success) {
        console.error(`${LOG} 🔴 Scan failed:`, result.error, result.message);
        if (result.error === "FREE_LIMIT_REACHED") {
          showUpgradeBanner();
        } else {
          showToast("Error: " + (result.message || "API unavailable"));
          emptyState.classList.remove("hidden");
        }
        resetScanBtn();
        return;
      }

      console.log(`${LOG} ✅ Scan results received:`, result.results?.summary);
      scanResults = result.results;
      renderResults(result.results);
      await refreshScanLimit();

    } catch (err) {
      console.error(`${LOG} 🔴 Scan error:`, err);
      const msg = err.message || String(err);
      if (msg.includes("Receiving end does not exist")) {
        showToast("Content script not loaded. Reload the page and try again.");
      } else if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
        showToast("API unreachable. Is the backend running on localhost:8000?");
      } else {
        showToast("Error: " + msg.slice(0, 80));
      }
      emptyState.classList.remove("hidden");
    } finally {
      setTimeout(() => {
        progressWrap.classList.remove("visible");
        progressBar.style.width = "0%";
      }, 500);
      resetScanBtn();
    }
  }

  function resetScanBtn() {
    scanBtn.disabled = false;
    scanBtn.classList.remove("scanning");
    scanText.textContent = "Scan This Page";
    scanIcon.textContent = "🔍";
  }

  function animateProgress(from, to, duration) {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const value = from + (to - from) * progress;
      progressBar.style.width = value + "%";
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // ─── Render Results ───────────────────────────────────────────────────────

  function renderResults(data) {
    const { summary, broken_links, ok_links, redirect_links } = data;

    countBroken.textContent = summary.broken;
    countOk.textContent = summary.ok;
    countTotal.textContent = summary.total;

    if (summary.estimated_monthly_loss_inr > 0) {
      lossBanner.style.display = "flex";
      lossAmount.textContent = `₹${summary.estimated_monthly_loss_inr.toLocaleString("en-IN")}/month`;
    }

    resultsList.innerHTML = "";

    const issues = [...broken_links, ...redirect_links];

    if (issues.length === 0) {
      resultsList.innerHTML = `
        <div style="text-align:center;padding:20px;color:var(--text-2);font-size:12px;">
          <div style="font-size:28px;margin-bottom:8px;">✅</div>
          <div style="font-weight:600;color:var(--green);margin-bottom:4px;">All links are healthy!</div>
          <div>No broken or out-of-stock links found.</div>
        </div>
      `;
    } else {
      issues.forEach((link) => renderResultItem(link));
    }

    emptyState.classList.add("hidden");
    resultsSection.classList.remove("hidden");
  }

  function renderResultItem(link) {
    const el = document.createElement("div");
    el.className = `result-item ${link.status}`;

    const statusLabel = {
      broken: "BROKEN",
      out_of_stock: "OUT OF STOCK",
      timeout: "TIMEOUT",
      redirect: "REDIRECT",
      unverifiable: "UNVERIFIABLE",
    }[link.status] || link.status.toUpperCase();

    const pillClass = {
      broken: "pill-broken",
      out_of_stock: "pill-out_of_stock",
      redirect: "pill-redirect",
      unverifiable: "pill-unverifiable",
    }[link.status] || "pill-broken";

    el.innerHTML = `
      <div class="result-top">
        <div class="result-anchor" title="${link.anchor_text}">${link.anchor_text || link.url}</div>
        <span class="result-status-pill ${pillClass}">${statusLabel}</span>
      </div>
      <div class="result-url">${link.url.slice(0, 60)}${link.url.length > 60 ? "…" : ""}</div>
      ${link.estimated_loss ? `<div class="result-loss">📉 Est. loss: ${link.estimated_loss}</div>` : ""}
      ${link.ai_suggestion ? `<div class="result-suggestion">💡 ${link.ai_suggestion}</div>` : ""}
      <button class="copy-btn" data-url="${link.url}">📋 Copy URL</button>
    `;

    el.querySelector(".copy-btn").addEventListener("click", (e) => {
      const url = e.currentTarget.dataset.url;
      navigator.clipboard.writeText(url).then(() => {
        e.currentTarget.textContent = "✓ Copied!";
        setTimeout(() => (e.currentTarget.innerHTML = "📋 Copy URL"), 1500);
      });
    });

    resultsList.appendChild(el);
  }

  // ─── Overlays Toggle ──────────────────────────────────────────────────────

  toggleOverlaysBtn.addEventListener("click", async () => {
    if (!currentTab?.id || !scanResults) return;

    if (!overlaysShown) {
      await chrome.tabs.sendMessage(currentTab.id, {
        action: "APPLY_OVERLAYS",
        results: scanResults,
      });
      overlaysShown = true;
      toggleOverlaysBtn.textContent = "Hide Overlays";
      toggleOverlaysBtn.classList.add("active");
    } else {
      await chrome.tabs.sendMessage(currentTab.id, { action: "REMOVE_OVERLAYS" });
      overlaysShown = false;
      toggleOverlaysBtn.textContent = "Show on Page";
      toggleOverlaysBtn.classList.remove("active");
    }
  });

  // ─── History ──────────────────────────────────────────────────────────────

  async function loadHistory() {
    const { history } = await new Promise((res) =>
      chrome.runtime.sendMessage({ action: "GET_SCAN_HISTORY" }, res)
    );

    const list = document.getElementById("history-list");
    const empty = document.getElementById("history-empty");
    list.innerHTML = "";

    if (!history?.length) {
      empty.classList.remove("hidden");
      return;
    }

    empty.classList.add("hidden");
    history.slice(0, 15).forEach((entry) => {
      const el = document.createElement("div");
      el.className = "history-item";
      const domain = (() => {
        try { return new URL(entry.pageUrl).hostname; } catch { return entry.pageUrl; }
      })();
      const date = new Date(entry.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      const broken = entry.result?.summary?.broken || 0;
      el.innerHTML = `
        <div class="history-item-url">${domain}</div>
        <div class="history-item-meta">
          <span class="history-item-date">${date}</span>
          <span class="history-item-broken">${broken} broken</span>
          <span style="font-size:10px;color:var(--text-2);">${entry.result?.summary?.total || 0} checked</span>
        </div>
      `;
      list.appendChild(el);
    });
  }

  // ─── Account ─────────────────────────────────────────────────────────────

  async function loadAccount() {
    const { user } = await new Promise((res) =>
      chrome.runtime.sendMessage({ action: "GET_USER" }, res)
    );

    const loggedIn = document.getElementById("account-logged-in");
    const loggedOut = document.getElementById("account-logged-out");

    if (user) {
      loggedIn.classList.remove("hidden");
      loggedOut.classList.add("hidden");
      document.getElementById("account-email").textContent = user.email || "—";
      document.getElementById("account-plan").textContent =
        user.subscription
          ? user.subscription.charAt(0).toUpperCase() + user.subscription.slice(1) + " Plan"
          : "Free Plan";

      if (user.subscription === "pro" || user.subscription === "agency") {
        document.getElementById("upgrade-btn-account").style.display = "none";
      }
    } else {
      loggedIn.classList.add("hidden");
      loggedOut.classList.remove("hidden");
    }

    document.getElementById("logout-btn")?.addEventListener("click", () => {
      chrome.runtime.sendMessage({ action: "LOGOUT" }, () => {
        loggedIn.classList.add("hidden");
        loggedOut.classList.remove("hidden");
      });
    });

    document.getElementById("upgrade-btn-account")?.addEventListener("click", async () => {
      chrome.tabs.create({ url: await getAppUrl() + "/pricing?source=extension" });
    });

    // Dev admin toggle
    const devToggle = document.getElementById("dev-admin-toggle");
    const devBadge = document.getElementById("dev-admin-badge");
    chrome.runtime.sendMessage({ action: "GET_DEV_ADMIN" }, (res) => {
      if (res?.dev_admin && devBadge) {
        devBadge.classList.remove("hidden");
        planBadge.textContent = "DEV";
        planBadge.className = "badge-pro";
      }
      if (devToggle) {
        devToggle.checked = res?.dev_admin === true;
      }
    });
    devToggle?.addEventListener("change", (e) => {
      const enabled = e.currentTarget.checked;
      chrome.runtime.sendMessage({ action: "SET_DEV_ADMIN", enabled }, () => {
        if (enabled) {
          planBadge.textContent = "DEV";
          planBadge.className = "badge-pro";
          devBadge?.classList.remove("hidden");
        } else {
          refreshUserState();
          devBadge?.classList.add("hidden");
        }
      });
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  async function refreshUserState() {
    const { dev_admin } = await new Promise((res) =>
      chrome.runtime.sendMessage({ action: "GET_DEV_ADMIN" }, res)
    );
    if (dev_admin) {
      planBadge.textContent = "DEV";
      planBadge.className = "badge-pro";
      return;
    }

    const { user } = await new Promise((res) =>
      chrome.runtime.sendMessage({ action: "GET_USER" }, res)
    );

    if (user?.subscription === "pro") {
      planBadge.textContent = "PRO";
      planBadge.classList.add("badge-pro");
      planBadge.classList.remove("badge-free");
    } else if (user?.subscription === "agency") {
      planBadge.textContent = "AGENCY";
      planBadge.classList.add("badge-pro");
    }
  }

  async function refreshScanLimit() {
    const limit = await new Promise((res) =>
      chrome.runtime.sendMessage({ action: "GET_SCAN_LIMIT" }, res)
    );

    if (limit.remaining === Infinity) {
      scansLeftText.textContent = "Unlimited scans";
    } else {
      scansLeftText.textContent = `${limit.remaining} free scan${limit.remaining !== 1 ? "s" : ""} left today`;
    }
  }

  function showUpgradeBanner() {
    emptyState.classList.add("hidden");
    resultsSection.classList.add("hidden");
    upgradeBanner.classList.remove("hidden");
    document.getElementById("upgrade-btn")?.addEventListener("click", async () => {
      chrome.tabs.create({ url: await getAppUrl() + "/pricing?source=extension&trigger=limit" });
    });
    document.getElementById("upgrade-btn-yt")?.addEventListener("click", async () => {
      chrome.tabs.create({ url: await getAppUrl() + "/pricing?source=extension&trigger=youtube" });
    });
  }

  function showToast(msg) {
    const toast = document.createElement("div");
    toast.style.cssText = `
      position: fixed; bottom: 60px; left: 50%; transform: translateX(-50%);
      background: #1c1c1e; color: #f5f5f7; padding: 8px 16px;
      border-radius: 8px; font-size: 11px; z-index: 9999;
      border: 1px solid rgba(255,255,255,0.1);
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
});
