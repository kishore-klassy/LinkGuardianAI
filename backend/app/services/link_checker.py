"""
Production-grade multi-tier link checker for affiliate links.

Architecture:
  Tier 1 (HttpStrategy)   — Fast HTTP HEAD/GET with redirect following
  Tier 2 (BrowserStrategy) — Headless Chromium via Playwright for JS redirects & bot-blocked sites
  Tier 3 (ContentAnalysis) — Soft 404 detection, Amazon OOS, JS redirect extraction

All tiers are fused by LinkChecker, which returns accurate, trustworthy results.
"""

import time
import re
import os
import asyncio
from dataclasses import dataclass, field
from typing import Optional
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

from app.models.schemas import LinkResult
from app.logging_config import logger


# ─── Configuration ─────────────────────────────────────────────────────────────

SOCIAL_DOMAINS = {
    "facebook.com", "instagram.com", "twitter.com", "x.com",
    "linkedin.com", "tiktok.com", "pinterest.com", "snapchat.com",
    "reddit.com", "threads.net", "fb.com", "whatsapp.com",
}

AMAZON_DOMAINS = {
    "amazon.com", "amazon.in", "amazon.co.uk",
    "amazon.de", "amazon.co.jp", "amzn.to", "amzn.in",
}

SHORT_DOMAINS = {
    "bit.ly", "t.co", "tinyurl.com", "amzn.to",
    "short.link", "ow.ly", "geni.us", "shorturl.at",
}

BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate",
    "DNT": "1",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}

SOFT_404_TITLE_PATTERNS = [
    "404", "not found", "page not found", "page doesn't exist",
    "this page cannot be found", "oops", "sorry",
]

SOFT_404_BODY_PATTERNS = [
    "page not found", "this page could not be found",
    "the page you requested was not found",
    "this page doesn't exist", "oops! that page can't be found",
    "sorry, the page you requested was not found",
    "we couldn't find that page", "page does not exist",
    "no longer available", "dogs of amazon",
    "this product is no longer available",
    "the page you are looking for is not available",
    "we can't find the page you're looking for",
    "this link appears to be broken",
]

JS_REDIRECT_PATTERNS = [
    re.compile(r'window\.location\s*=\s*["\'](https?://[^"\']+)["\']'),
    re.compile(r'window\.location\.href\s*=\s*["\'](https?://[^"\']+)["\']'),
    re.compile(r'window\.location\.replace\s*\(\s*["\'](https?://[^"\']+)["\']'),
    re.compile(r'meta\s+http-equiv=["\']refresh["\'][^>]*content=["\']\d+;\s*url=([^"\' >]+)'),
    re.compile(r'<meta[^>]+url=([^"\' >]+)'),
    re.compile(r'location\.href\s*=\s*["\'](https?://[^"\']+)["\']'),
]

# ─── Data ──────────────────────────────────────────────────────────────────────

@dataclass
class CheckResult:
    status: str  # ok | broken | out_of_stock | unverifiable | timeout | redirect | error
    status_code: Optional[int] = None
    final_url: Optional[str] = None
    error: Optional[str] = None
    estimated_loss: Optional[str] = None
    page_title: Optional[str] = None
    redirect_chain: list = field(default_factory=list)


# ─── Helpers ────────────────────────────────────────────────────────────────────

def get_domain(url: str) -> str:
    try:
        return urlparse(url).hostname or ""
    except Exception:
        return ""


def domain_matches(domain: str, domain_set: set) -> bool:
    d = domain.lower()
    for blocked in domain_set:
        if blocked in d:
            return True
    return False


def is_amazon_url(url: str) -> bool:
    return domain_matches(get_domain(url), AMAZON_DOMAINS)


def format_duration(seconds: float) -> str:
    if seconds < 1:
        return f"{seconds*1000:.0f}ms"
    return f"{seconds:.1f}s"


# ─── Tier 1: HTTP Strategy ──────────────────────────────────────────────────────

class HttpStrategy:
    """Fast HTTP-based link checking with redirect following and content analysis."""

    async def _expand_short_url(self, client: httpx.AsyncClient, url: str) -> str:
        try:
            r = await client.head(url, headers=BROWSER_HEADERS, follow_redirects=True, timeout=10)
            return str(r.url)
        except httpx.TimeoutException:
            return url
        except Exception:
            try:
                r = await client.get(url, headers=BROWSER_HEADERS, follow_redirects=True, timeout=10)
                return str(r.url)
            except Exception:
                return url

    async def _check_amazon_stock(self, client: httpx.AsyncClient, url: str) -> CheckResult:
        try:
            r = await client.get(url, headers=BROWSER_HEADERS, follow_redirects=True, timeout=15)
            if r.status_code == 403:
                return CheckResult("unverifiable", status_code=403)

            soup = BeautifulSoup(r.text, "html.parser")
            page_text = soup.get_text().lower()

            if "page not found" in page_text or "dogs of amazon" in page_text:
                return CheckResult("broken", status_code=404, error="Amazon page not found")

            if soup.find(id="add-to-cart-button"):
                return CheckResult("ok", status_code=r.status_code, page_title=soup.title.string if soup.title else None)

            availability = soup.find(id="availability")
            if availability:
                avail_text = availability.get_text().lower()
                if "in stock" in avail_text:
                    return CheckResult("ok", status_code=r.status_code)
                for phrase in [
                    "currently unavailable", "out of stock", "no longer available",
                    "we don't know when or if this item will be back in stock",
                ]:
                    if phrase in avail_text:
                        return CheckResult("out_of_stock", status_code=r.status_code)

            has_product_signals = any(s in page_text for s in ["add to cart", "buy now", "price"])
            if not has_product_signals:
                return CheckResult("unverifiable", status_code=r.status_code)

            for phrase in [
                "currently unavailable", "out of stock", "no longer available",
                "we don't know when or if this item will be back in stock",
            ]:
                if phrase in page_text:
                    return CheckResult("out_of_stock", status_code=r.status_code)

            return CheckResult("ok", status_code=r.status_code)

        except httpx.TimeoutException:
            return CheckResult("timeout", error="Amazon check timed out")
        except Exception as e:
            return CheckResult("error", error=str(e))

    def _find_js_redirect(self, html: str) -> Optional[str]:
        for pattern in JS_REDIRECT_PATTERNS:
            match = pattern.search(html)
            if match:
                url = match.group(1).strip()
                if url.startswith("http"):
                    return url
        return None

    def _is_soft_404(self, soup: BeautifulSoup, page_text: str, title_tag) -> bool:
        # Check title
        if title_tag and title_tag.string:
            title = title_tag.string.lower().strip()
            if any(p in title for p in SOFT_404_TITLE_PATTERNS):
                return True

        # Check body patterns
        body = soup.find("body")
        body_text = body.get_text().lower() if body else page_text
        if any(p in body_text for p in SOFT_404_BODY_PATTERNS):
            return True

        # Check heading content (h1 often says "404" or "Not Found")
        for tag in ["h1", "h2", "h3"]:
            headings = soup.find_all(tag)
            for h in headings:
                text = h.get_text().lower().strip()
                if text in ("404", "page not found", "not found", "oops"):
                    return True

        return False

    async def check(
        self, url: str, client: httpx.AsyncClient, 
        follow_js_redirect: bool = True,
        depth: int = 0
    ) -> CheckResult:
        """
        Check a single URL using HTTP.
        If follow_js_redirect is True and the page contains a JS redirect,
        recursively check the target URL.
        """
        if depth > 3:
            return CheckResult("unverifiable", error="Redirect chain too deep")

        # Expand short links
        expanded_url = await self._expand_short_url(client, url)
        if expanded_url != url and is_amazon_url(expanded_url):
            return await self._check_amazon_stock(client, expanded_url)

        # Standard check
        try:
            r = await client.head(expanded_url, headers=BROWSER_HEADERS, follow_redirects=True, timeout=12)
            final_url = str(r.url)
            status_code = r.status_code

            # Retry with GET for servers that reject HEAD
            if status_code in (400, 403, 405, 501):
                r = await client.get(expanded_url, headers=BROWSER_HEADERS, follow_redirects=True, timeout=12)
                status_code = r.status_code
                final_url = str(r.url)

            # Check if we ended up on Amazon
            if is_amazon_url(final_url):
                return await self._check_amazon_stock(client, final_url)

        except httpx.TimeoutException:
            return CheckResult("timeout", error="Connection timed out")

        if status_code is None:
            return CheckResult("error", error="Could not reach URL")

        # 4xx handling — heuristic, no domain lists
        if status_code >= 400:
            domain = get_domain(final_url) or get_domain(url)
            domain_lower = domain.lower()

            # SOCIAL: login-required sites can never be verified
            if domain_matches(domain_lower, SOCIAL_DOMAINS):
                return CheckResult("unverifiable", status_code=status_code,
                                   error="Login required — cannot verify")

            # 403 on non-social → bot-blocked, not broken
            if status_code == 403:
                return CheckResult("unverifiable", status_code=status_code,
                                   error="Bot protection blocked the request")

            # 404/410 → genuinely broken
            if status_code in (404, 410):
                return CheckResult("broken", status_code=status_code,
                                   error=f"Page returned {status_code}")

            # Other 4xx → broken by default
            return CheckResult("broken", status_code=status_code,
                               error=f"HTTP {status_code}")

        # 3xx — should not happen with follow_redirects=True, but handle anyway
        if status_code in (301, 302, 307, 308):
            return CheckResult("redirect", status_code=status_code, final_url=final_url)

        # 2xx — content analysis
        if status_code < 300:
            try:
                r = await client.get(final_url, headers=BROWSER_HEADERS, follow_redirects=True, timeout=12)
                soup = BeautifulSoup(r.text, "html.parser")
                page_text = soup.get_text()
                title_tag = soup.title

                # Check for JS redirect in page content
                if follow_js_redirect:
                    js_target = self._find_js_redirect(r.text)
                    if js_target and js_target != url:
                        logger.logger.debug("  JS redirect at %s → %s", url[:50], js_target[:60])
                        return await self.check(js_target, client, follow_js_redirect=True, depth=depth + 1)

                # Check for soft 404
                if self._is_soft_404(soup, page_text, title_tag):
                    return CheckResult("broken", status_code=status_code,
                                       final_url=final_url, error="Soft 404 detected")

                # Check for Amazon (after potential JS redirect)
                if is_amazon_url(final_url):
                    return await self._check_amazon_stock(client, final_url)

                title = title_tag.string.strip() if title_tag and title_tag.string else None
                return CheckResult("ok", status_code=status_code, final_url=final_url,
                                   page_title=title)

            except Exception as e:
                return CheckResult("ok", status_code=status_code, final_url=final_url,
                                   error=f"Content analysis skipped: {str(e)[:50]}")

        return CheckResult("ok", status_code=status_code, final_url=final_url)


# ─── Tier 2: Browser Strategy ───────────────────────────────────────────────────

class BrowserStrategy:
    """Headless Chromium verification using Playwright.
    
    Follows ALL redirect types (HTTP, JS, meta refresh), renders JavaScript,
    and detects page content that HTTP-only checks cannot see.
    """

    def __init__(self):
        self._playwright = None
        self._browser = None
        self._context = None
        self._ready = False
        self._lock = asyncio.Lock()

    async def ensure_browser(self):
        if self._ready:
            return
        async with self._lock:
            if self._ready:
                return
            try:
                from playwright.async_api import async_playwright
                self._playwright = await async_playwright().start()
                self._browser = await self._playwright.chromium.launch(
                    headless=True,
                    args=[
                        "--no-sandbox",
                        "--disable-setuid-sandbox",
                        "--disable-dev-shm-usage",
                        "--disable-gpu",
                    ],
                )
                self._context = await self._browser.new_context(
                    user_agent=BROWSER_HEADERS["User-Agent"],
                    viewport={"width": 1280, "height": 720},
                    locale="en-US",
                    timezone_id="America/New_York",
                )
                self._ready = True
                logger.logger.info("Playwright browser launched")
            except ImportError:
                logger.logger.warning("Playwright not installed — browser checks unavailable")
                self._ready = False
            except Exception as e:
                logger.logger.warning("Failed to launch Playwright browser: %s", e)
                self._ready = False

    async def check(self, url: str, timeout: int = 30000) -> CheckResult:
        await self.ensure_browser()
        if not self._ready:
            return CheckResult("unverifiable", error="Browser unavailable")

        page = await self._context.new_page()
        try:
            start = time.perf_counter()
            response = await page.goto(url, timeout=timeout, wait_until="domcontentloaded")
            elapsed = time.perf_counter() - start

            final_url = page.url
            status_code = response.status if response else None
            title = await page.title()
            content = await page.content()

            logger.logger.debug("  BROWSER %s → %d %s [%.1fs]", url[:50], status_code or 0, final_url[:50], elapsed)

            # Amazon OOS check via rendered DOM
            if is_amazon_url(final_url):
                add_to_cart = await page.query_selector("#add-to-cart-button")
                if add_to_cart:
                    return CheckResult("ok", status_code=status_code, final_url=final_url,
                                       page_title=title)
                availability = await page.query_selector("#availability")
                if availability:
                    avail_text = await availability.inner_text()
                    avail_lower = avail_text.lower()
                    if "in stock" in avail_lower:
                        return CheckResult("ok", status_code=status_code, final_url=final_url)
                    for phrase in ["currently unavailable", "out of stock", "no longer available"]:
                        if phrase in avail_lower:
                            return CheckResult("out_of_stock", status_code=status_code, final_url=final_url)

                # Full page text fallback
                body_text = (await page.inner_text("body")).lower()
                if "page not found" in body_text or "dogs of amazon" in body_text:
                    return CheckResult("broken", status_code=404, error="Amazon page not found")
                if "currently unavailable" in body_text or "out of stock" in body_text:
                    return CheckResult("out_of_stock", status_code=status_code)
                return CheckResult("ok", status_code=status_code, final_url=final_url, page_title=title)

            # Soft 404 detection via rendered content
            body_text = (await page.inner_text("body")).lower()
            title_lower = title.lower() if title else ""

            if any(p in title_lower for p in SOFT_404_TITLE_PATTERNS) or \
               any(p in body_text[:500] for p in SOFT_404_BODY_PATTERNS):
                return CheckResult("broken", status_code=status_code,
                                   final_url=final_url, error="Soft 404 detected (browser)")

            # Check if the page actually loaded meaningful content
            text_length = len(body_text.strip())
            if text_length < 50 and status_code and 200 <= status_code < 300:
                return CheckResult("unverifiable", status_code=status_code,
                                   final_url=final_url, error="Page has no meaningful content")

            return CheckResult("ok", status_code=status_code, final_url=final_url, page_title=title)

        except Exception as e:
            err_msg = str(e)
            if "timeout" in err_msg.lower():
                return CheckResult("timeout", error=f"Browser timed out: {err_msg[:80]}")
            return CheckResult("unverifiable", error=f"Browser error: {err_msg[:80]}")
        finally:
            await page.close()

    async def close(self):
        if self._browser:
            try:
                await self._browser.close()
            except Exception:
                pass
        if self._playwright:
            try:
                await self._playwright.stop()
            except Exception:
                pass
        self._ready = False
        logger.logger.info("Playwright browser closed")


# ─── Orchestrator ───────────────────────────────────────────────────────────────

class LinkChecker:

    def __init__(self, use_browser: bool = True):
        self.http = HttpStrategy()
        self.browser = BrowserStrategy() if use_browser else None
        self._browser_started = False

    async def check_link(
        self,
        link,
        client: httpx.AsyncClient,
        use_browser_for_unverifiable: bool = True,
    ) -> LinkResult:
        url = link.url if hasattr(link, "url") else link.get("url", "")
        anchor_text = link.anchor_text if hasattr(link, "anchor_text") else link.get("anchor_text", "")
        context = link.context if hasattr(link, "context") else link.get("context", "")
        start = time.perf_counter()

        if not url or not url.startswith("http"):
            return LinkResult(
                url=url, anchor_text=anchor_text, context=context,
                status="skipped", status_code=None, final_url=None,
                error="Invalid URL",
            )

        # Tier 1: HTTP check
        result = await self.http.check(url, client)

        # Tier 2: Browser fallback for unverifiable links
        if result.status == "unverifiable" and self.browser and use_browser_for_unverifiable:
            if not self._browser_started:
                try:
                    await self.browser.ensure_browser()
                    self._browser_started = True
                except Exception as e:
                    logger.logger.warning("Browser init failed: %s", e)

            if self.browser._ready:
                browser_result = await self.browser.check(url)
                if browser_result.status in ("ok", "broken", "out_of_stock", "timeout"):
                    logger.logger.debug("  Browser result overrides HTTP: %s → %s",
                                        result.status, browser_result.status)
                    result = browser_result
                elif browser_result.status == "unverifiable" and browser_result.page_title:
                    result = browser_result

        # Build loss estimate
        estimated_loss = None
        if result.status in ("broken", "out_of_stock"):
            estimated_loss = "₹500–₹2000/month"

        elapsed = time.perf_counter() - start
        logger.logger.debug("  CHECK %s → %s [%s]", url[:50], result.status, format_duration(elapsed))

        return LinkResult(
            url=url,
            anchor_text=anchor_text,
            context=context,
            status=result.status,
            status_code=result.status_code,
            final_url=result.final_url or url,
            error=result.error,
            estimated_loss=estimated_loss,
            page_title=result.page_title,
        )

    async def close(self):
        if self.browser:
            await self.browser.close()


# ─── Module-level singleton for backward compatibility ─────────────────────────

_checker: Optional[LinkChecker] = None
_checker_lock = asyncio.Lock()


async def get_checker() -> LinkChecker:
    global _checker
    if _checker is None:
        async with _checker_lock:
            if _checker is None:
                _checker = LinkChecker()
    return _checker


async def check_single_link(client: httpx.AsyncClient, link) -> LinkResult:
    """Backward-compatible wrapper."""
    checker = await get_checker()
    return await checker.check_link(link, client)


async def close_checker():
    global _checker
    if _checker:
        await _checker.close()
        _checker = None
