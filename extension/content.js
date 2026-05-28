// ExpireLinkX - Content Script
const LOG = "[ExpireLinkX:Content]";

(function () {
  "use strict";

  console.log(`${LOG} ✅ Content script loaded on:`, window.location.hostname);

  let overlaysActive = false;
  let scanResults = null;

  // ─── Link Extraction ────────────────────────────────────────────────────────

  function extractLinks() {
    const anchors = document.querySelectorAll("a[href]");
    const pageUrl = window.location.href;
    const pageDomain = window.location.hostname;
    const links = [];
    const seen = new Set();

    anchors.forEach((a) => {
      const href = a.href;
      if (!href) return;
      if (seen.has(href)) return;
      if (!href.startsWith("http")) return;

      // Skip internal links
      try {
        const url = new URL(href);
        if (url.hostname === pageDomain) return;
      } catch (e) {
        return;
      }

      seen.add(href);

      // Get surrounding context (sentence around the link)
      const parent = a.parentElement;
      const context = parent ? parent.innerText?.slice(0, 200) || "" : "";

      links.push({
        url: href,
        anchor_text: a.innerText?.trim()?.slice(0, 100) || href,
        context: context.trim(),
        element_id: `lg-${Math.random().toString(36).slice(2, 8)}`,
      });

      // Tag the DOM element for later overlay
      a.setAttribute("data-lg-id", links[links.length - 1].element_id);
    });

    console.log(`${LOG} ▸ Extracted ${links.length} external links from page`);
    return { links, page_url: pageUrl };
  }

  // ─── Visual Overlays ────────────────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById("lg-styles")) return;

    const style = document.createElement("style");
    style.id = "lg-styles";
    style.textContent = `
      .lg-badge {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        font-size: 10px;
        font-weight: 700;
        font-family: 'SF Pro Text', -apple-system, sans-serif;
        padding: 2px 6px;
        border-radius: 4px;
        margin-left: 4px;
        cursor: pointer;
        vertical-align: middle;
        text-decoration: none !important;
        position: relative;
        z-index: 999999;
        white-space: nowrap;
        line-height: 1.4;
        letter-spacing: 0.02em;
        transition: all 0.15s ease;
      }
      .lg-badge:hover { opacity: 0.85; transform: scale(1.05); }
      .lg-badge-broken {
        background: #ff3b30;
        color: #fff;
        box-shadow: 0 1px 4px rgba(255,59,48,0.4);
        animation: lg-pulse 2s infinite;
      }
      .lg-badge-out_of_stock {
        background: #ff9500;
        color: #fff;
        box-shadow: 0 1px 4px rgba(255,149,0,0.4);
        animation: lg-pulse 2s infinite;
      }
      .lg-badge-timeout {
        background: #8e8e93;
        color: #fff;
      }
      .lg-badge-unverifiable {
        background: #636366;
        color: #fff;
      }
      .lg-badge-redirect {
        background: #007aff;
        color: #fff;
      }
      .lg-badge-ok {
        background: #34c759;
        color: #fff;
      }
      .lg-link-broken {
        outline: 2px solid #ff3b30 !important;
        outline-offset: 2px;
        border-radius: 2px;
      }
      .lg-link-out_of_stock {
        outline: 2px solid #ff9500 !important;
        outline-offset: 2px;
        border-radius: 2px;
      }
      .lg-tooltip {
        position: fixed;
        z-index: 2147483647;
        background: #1c1c1e;
        color: #fff;
        border-radius: 10px;
        padding: 10px 14px;
        font-size: 12px;
        font-family: -apple-system, sans-serif;
        max-width: 300px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.35);
        pointer-events: none;
        line-height: 1.5;
        border: 1px solid rgba(255,255,255,0.1);
      }
      .lg-tooltip-title {
        font-weight: 700;
        margin-bottom: 4px;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #ff453a;
      }
      .lg-tooltip-suggestion {
        color: #30d158;
        margin-top: 6px;
        font-size: 11px;
      }
      @keyframes lg-pulse {
        0%, 100% { box-shadow: 0 1px 4px rgba(255,59,48,0.4); }
        50% { box-shadow: 0 1px 10px rgba(255,59,48,0.7); }
      }
    `;
    document.head.appendChild(style);
  }

  function createTooltip() {
    const existing = document.getElementById("lg-tooltip");
    if (existing) return existing;
    const tip = document.createElement("div");
    tip.id = "lg-tooltip";
    tip.className = "lg-tooltip";
    tip.style.display = "none";
    document.body.appendChild(tip);
    return tip;
  }

  function showTooltip(e, result) {
    const tip = document.getElementById("lg-tooltip") || createTooltip();

    const statusLabel = {
      broken: "🔴 BROKEN LINK",
      out_of_stock: "🟠 OUT OF STOCK",
      timeout: "⚪ TIMEOUT",
      redirect: "🔵 REDIRECT",
      unverifiable: "⚫ UNVERIFIABLE",
    }[result.status] || result.status.toUpperCase();

    tip.innerHTML = `
      <div class="lg-tooltip-title">${statusLabel}</div>
      <div>${result.anchor_text || result.url}</div>
      ${result.estimated_loss ? `<div style="color:#ff9f0a;margin-top:4px;font-size:11px;">📉 Est. loss: ${result.estimated_loss}</div>` : ""}
      ${result.ai_suggestion ? `<div class="lg-tooltip-suggestion">💡 ${result.ai_suggestion}</div>` : ""}
    `;
    tip.style.display = "block";
    tip.style.left = Math.min(e.clientX + 12, window.innerWidth - 320) + "px";
    tip.style.top = Math.min(e.clientY + 12, window.innerHeight - 100) + "px";
  }

  function hideTooltip() {
    const tip = document.getElementById("lg-tooltip");
    if (tip) tip.style.display = "none";
  }

  function applyOverlays(results) {
    removeOverlays();
    injectStyles();
    createTooltip();

    const allResults = [
      ...(results.broken_links || []),
      ...(results.unverifiable_links || []),
      ...(results.redirect_links || []),
    ];

    allResults.forEach((result) => {
      const elements = document.querySelectorAll(`[data-lg-id]`);
      elements.forEach((el) => {
        const link = (results.broken_links || []).find(
          (l) => l.url === el.href
        ) || (results.unverifiable_links || []).find((l) => l.url === el.href)
          || (results.redirect_links || []).find((l) => l.url === el.href);

        if (!link) return;
        if (link.status === "ok") return;

        // Add colored outline to the link
        el.classList.add(`lg-link-${link.status}`);

        // Add badge after the link
        const badge = document.createElement("span");
        badge.className = `lg-badge lg-badge-${link.status}`;
        badge.setAttribute("data-lg-badge", "true");

        const labels = {
          broken: "✕ Dead",
          out_of_stock: "⚠ Out of Stock",
          timeout: "⏱ Slow",
          redirect: "→ Redirect",
          unverifiable: "? Unverifiable",
        };
        badge.textContent = labels[link.status] || link.status;

        badge.addEventListener("mouseenter", (e) => showTooltip(e, link));
        badge.addEventListener("mousemove", (e) => showTooltip(e, link));
        badge.addEventListener("mouseleave", hideTooltip);

        el.insertAdjacentElement("afterend", badge);
      });
    });

    overlaysActive = true;
    scanResults = results;
  }

  function removeOverlays() {
    document.querySelectorAll("[data-lg-badge]").forEach((el) => el.remove());
    document.querySelectorAll("[class*='lg-link-']").forEach((el) => {
      el.className = el.className.replace(/lg-link-\S+/g, "").trim();
    });
    hideTooltip();
    overlaysActive = false;
  }

  // ─── Message Handler ─────────────────────────────────────────────────────────

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "EXTRACT_LINKS") {
      console.log(`${LOG} 📩 Received EXTRACT_LINKS request`);
      const data = extractLinks();
      console.log(`${LOG} 📤 Responding with ${data.links.length} links`);
      sendResponse({ success: true, ...data });
      return true;
    }

    if (message.action === "APPLY_OVERLAYS") {
      console.log(`${LOG} 📩 Received APPLY_OVERLAYS`);
      applyOverlays(message.results);
      sendResponse({ success: true });
      return true;
    }

    if (message.action === "REMOVE_OVERLAYS") {
      console.log(`${LOG} 📩 Received REMOVE_OVERLAYS`);
      removeOverlays();
      sendResponse({ success: true });
      return true;
    }

    if (message.action === "GET_OVERLAY_STATUS") {
      sendResponse({ active: overlaysActive, results: scanResults });
      return true;
    }
  });

  console.log(`${LOG} ✅ Message listener ready`);
})();
