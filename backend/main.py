from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import asyncio
import httpx
from bs4 import BeautifulSoup
from pydantic import BaseModel
from typing import List, Optional
import re
import os
import stripe
from datetime import datetime
import json
from supabase import create_client, Client

app = FastAPI(title="LinkGuardian AI API", version="1.0.0")

# Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", os.getenv("SUPABASE_ANON_KEY", ""))
supabase_client: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict to your domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_placeholder")

# ─── Models ───────────────────────────────────────────────────────────────────

class LinkCheckRequest(BaseModel):
    links: List[dict]   # [{url, anchor_text, context}]
    page_url: str
    user_id: Optional[str] = None

class YouTubeRequest(BaseModel):
    channel_handle: str   # e.g. @TechReviews or channel URL
    user_id: Optional[str] = None
    max_videos: Optional[int] = 50  # Plan-gated: Free=5, Starter=20, Pro=200

class LinkResult(BaseModel):
    url: str
    anchor_text: str
    context: str
    status: str           # "ok" | "broken" | "out_of_stock" | "redirect" | "timeout"
    status_code: Optional[int]
    final_url: Optional[str]
    error: Optional[str]
    ai_suggestion: Optional[str]
    estimated_loss: Optional[str]

# ─── Auth Helper ──────────────────────────────────────────────────────────────

async def get_user_id(authorization: str = Header(None)) -> str:
    """Verify Supabase JWT and return user ID, or raise 401."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = authorization.split(" ")[1]
    if not supabase_client:
        # Fallback for local testing without DB
        return "mock_user_id"
    try:
        user_response = supabase_client.auth.get_user(token)
        return user_response.user.id
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

# ─── Helpers ──────────────────────────────────────────────────────────────────

AMAZON_DOMAINS = ["amazon.com", "amazon.in", "amazon.co.uk", "amazon.de", "amazon.co.jp", "amzn.to", "amzn.in"]

def extract_youtube_info(input_str: str) -> dict:
    """
    Parses a YouTube URL or input string.
    Returns a dict with:
      - type: "video" | "channel_id" | "handle" | "unknown"
      - value: the video ID, channel ID, or handle
    """
    input_str = input_str.strip()
    
    # 1. Check for Video URLs
    # Patterns: watch?v=ID, youtu.be/ID, shorts/ID, live/ID, embed/ID
    video_patterns = [
        r"(?:v=|/v/|/embed/|/shorts/|/live/|youtu\.be/)([a-zA-Z0-9_-]{11})"
    ]
    for pattern in video_patterns:
        match = re.search(pattern, input_str)
        if match:
            return {"type": "video", "value": match.group(1)}
            
    # 2. Check for Channel URLs
    # youtube.com/channel/UC...
    channel_id_match = re.search(r"youtube\.com/channel/(UC[a-zA-Z0-9_-]{22})", input_str)
    if channel_id_match:
        return {"type": "channel_id", "value": channel_id_match.group(1)}
        
    # youtube.com/c/Handle or youtube.com/@Handle
    handle_match = re.search(r"youtube\.com/(?:c/|@)([a-zA-Z0-9_-]+)", input_str)
    if handle_match:
        return {"type": "handle", "value": handle_match.group(1)}
        
    # Raw channel ID starting with UC
    if input_str.startswith("UC") and len(input_str) == 24:
        return {"type": "channel_id", "value": input_str}
        
    # Raw handle: remove @ prefix
    clean_handle = input_str.lstrip("@")
    if clean_handle:
        return {"type": "handle", "value": clean_handle}
        
    return {"type": "unknown", "value": input_str}

def is_amazon_url(url: str) -> bool:
    return any(d in url for d in AMAZON_DOMAINS)

async def expand_short_url(client: httpx.AsyncClient, url: str) -> str:
    """Follow redirects to get the final URL."""
    try:
        r = await client.head(url, follow_redirects=True, timeout=8)
        return str(r.url)
    except Exception:
        return url

async def check_amazon_stock(client: httpx.AsyncClient, url: str) -> dict:
    """Fetch Amazon page and check if product is available."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
    try:
        r = await client.get(url, headers=headers, follow_redirects=True, timeout=12)
        soup = BeautifulSoup(r.text, "html.parser")
        page_text = soup.get_text().lower()

        out_of_stock_phrases = [
            "currently unavailable",
            "this item is currently unavailable",
            "unavailable",
            "out of stock",
            "no longer available",
            "this product is not available",
            "item under review",
            "asin b",  # Amazon 404 pages
        ]
        for phrase in out_of_stock_phrases:
            if phrase in page_text:
                return {"status": "out_of_stock", "status_code": r.status_code}

        # Check for actual 404 content even if status is 200
        if "page not found" in page_text or "dogs of amazon" in page_text:
            return {"status": "broken", "status_code": 404}

        return {"status": "ok", "status_code": r.status_code}
    except httpx.TimeoutException:
        return {"status": "timeout", "status_code": None}
    except Exception as e:
        return {"status": "error", "status_code": None, "error": str(e)}

async def check_single_link(client: httpx.AsyncClient, link: dict) -> LinkResult:
    url = link.get("url", "")
    anchor_text = link.get("anchor_text", "")
    context = link.get("context", "")

    if not url or not url.startswith("http"):
        return LinkResult(
            url=url, anchor_text=anchor_text, context=context,
            status="skipped", status_code=None, final_url=None,
            error="Invalid URL", ai_suggestion=None, estimated_loss=None
        )

    try:
        # Expand shortened URLs first
        final_url = url
        short_domains = ["bit.ly", "t.co", "tinyurl.com", "amzn.to", "short.link", "ow.ly"]
        if any(d in url for d in short_domains):
            final_url = await expand_short_url(client, url)

        # Amazon special check
        if is_amazon_url(url) or is_amazon_url(final_url):
            result = await check_amazon_stock(client, final_url)
            return LinkResult(
                url=url, anchor_text=anchor_text, context=context,
                status=result["status"],
                status_code=result.get("status_code"),
                final_url=final_url,
                error=result.get("error"),
                ai_suggestion=None,
                estimated_loss="₹500–₹2000/month" if result["status"] != "ok" else None
            )

        # Standard link check
        try:
            r = await client.head(url, follow_redirects=True, timeout=10)
            final_url = str(r.url)
            status_code = r.status_code

            if status_code == 405:  # Method not allowed, try GET
                r = await client.get(url, follow_redirects=True, timeout=10)
                status_code = r.status_code
                final_url = str(r.url)

        except httpx.TimeoutException:
            return LinkResult(
                url=url, anchor_text=anchor_text, context=context,
                status="timeout", status_code=None, final_url=None,
                error="Connection timed out", ai_suggestion=None, estimated_loss=None
            )

        if status_code >= 400:
            status = "broken"
            estimated_loss = "₹200–₹800/month"
        elif status_code in (301, 302, 307, 308):
            status = "redirect"
            estimated_loss = None
        else:
            status = "ok"
            estimated_loss = None

        return LinkResult(
            url=url, anchor_text=anchor_text, context=context,
            status=status, status_code=status_code,
            final_url=final_url, error=None,
            ai_suggestion=None, estimated_loss=estimated_loss
        )

    except Exception as e:
        return LinkResult(
            url=url, anchor_text=anchor_text, context=context,
            status="error", status_code=None, final_url=None,
            error=str(e), ai_suggestion=None, estimated_loss=None
        )

async def get_ai_suggestions(broken_links: List[LinkResult]) -> List[LinkResult]:
    """Use Claude to suggest replacements for broken links."""
    if not broken_links:
        return broken_links

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))

        for link in broken_links[:5]:  # Limit to 5 AI calls per scan
            if link.status in ("broken", "out_of_stock") and link.anchor_text:
                prompt = f"""A broken affiliate link needs a replacement suggestion.

Anchor text: "{link.anchor_text}"
Context: "{link.context}"
Original URL: {link.url}
Status: {link.status}

Provide ONE concise suggestion (max 2 sentences) for what replacement product or search query the user should look for. Be specific and actionable. Do not mention the broken URL."""

                message = client.messages.create(
                    model="claude-sonnet-4-20250514",
                    max_tokens=150,
                    messages=[{"role": "user", "content": prompt}]
                )
                link.ai_suggestion = message.content[0].text.strip()

    except Exception:
        pass  # AI suggestions are best-effort

    return broken_links

# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

@app.post("/api/check-links")
async def check_links(request: LinkCheckRequest):
    """
    Main endpoint: Check all links on a page in parallel.
    Supports up to 100 links per request.
    """
    links = request.links[:100]  # Cap at 100

    async with httpx.AsyncClient(
        limits=httpx.Limits(max_connections=30, max_keepalive_connections=10),
        timeout=httpx.Timeout(15.0)
    ) as client:
        tasks = [check_single_link(client, link) for link in links]
        results = await asyncio.gather(*tasks, return_exceptions=True)

    # Filter out exceptions
    valid_results = []
    for r in results:
        if isinstance(r, LinkResult):
            valid_results.append(r)
        else:
            pass  # Log in production

    broken = [r for r in valid_results if r.status in ("broken", "out_of_stock", "timeout")]
    ok = [r for r in valid_results if r.status == "ok"]
    redirects = [r for r in valid_results if r.status == "redirect"]

    # Get AI suggestions for broken links
    broken = await get_ai_suggestions(broken)

    total_estimated_loss = len(broken) * 500  # Conservative estimate in INR

    # Save to DB if user_id is provided and Supabase is configured
    if request.user_id and supabase_client:
        try:
            supabase_client.table("scans").insert({
                "user_id": request.user_id,
                "page_url": request.page_url,
                "total_links": len(valid_results),
                "broken_count": len(broken),
                "ok_count": len(ok),
                "redirect_count": len(redirects),
                "timeout_count": len([r for r in valid_results if r.status == "timeout"]),
                "estimated_loss": total_estimated_loss
            }).execute()
        except Exception as e:
            print(f"Error saving scan to DB: {e}")

    return {
        "summary": {
            "total": len(valid_results),
            "broken": len(broken),
            "ok": len(ok),
            "redirects": len(redirects),
            "estimated_monthly_loss_inr": total_estimated_loss,
            "scanned_url": request.page_url,
            "scanned_at": datetime.utcnow().isoformat(),
        },
        "broken_links": [r.dict() for r in broken],
        "ok_links": [r.dict() for r in ok],
        "redirect_links": [r.dict() for r in redirects],
    }

@app.post("/api/check-youtube-channel")
async def check_youtube_channel(request: YouTubeRequest):
    """
    Scan all video descriptions of a YouTube channel for broken links.
    Requires YouTube Data API v3 key.
    """
    yt_api_key = os.getenv("YOUTUBE_API_KEY", "")
    if not yt_api_key:
        raise HTTPException(status_code=503, detail="YouTube API not configured")

    info = extract_youtube_info(request.channel_handle)
    channel_id = None
    channel_name = None
    channel_handle = None

    async with httpx.AsyncClient(timeout=15.0) as client:
        # Resolve to channel_id
        if info["type"] == "video":
            video_id = info["value"]
            # Look up video details to get the channel ID
            video_url = f"https://www.googleapis.com/youtube/v3/videos?part=snippet&id={video_id}&key={yt_api_key}"
            vr = await client.get(video_url)
            v_data = vr.json()
            if not v_data.get("items"):
                raise HTTPException(status_code=404, detail="Video or associated channel not found")
            channel_id = v_data["items"][0]["snippet"]["channelId"]
            channel_name = v_data["items"][0]["snippet"]["channelTitle"]
            
            # Retrieve the handle/customUrl of this channel
            channel_url = f"https://www.googleapis.com/youtube/v3/channels?part=id,snippet&id={channel_id}&key={yt_api_key}"
            cr = await client.get(channel_url)
            c_data = cr.json()
            if c_data.get("items"):
                channel_handle = c_data["items"][0]["snippet"].get("customUrl", "").lstrip("@")
            if not channel_handle:
                channel_handle = channel_name
                
        elif info["type"] == "channel_id":
            c_id = info["value"]
            channel_url = f"https://www.googleapis.com/youtube/v3/channels?part=id,snippet&id={c_id}&key={yt_api_key}"
            cr = await client.get(channel_url)
            c_data = cr.json()
            if not c_data.get("items"):
                raise HTTPException(status_code=404, detail="Channel not found")
            channel = c_data["items"][0]
            channel_id = channel["id"]
            channel_name = channel["snippet"]["title"]
            channel_handle = channel["snippet"].get("customUrl", "").lstrip("@")
            
        elif info["type"] == "handle":
            handle = info["value"]
            search_url = f"https://www.googleapis.com/youtube/v3/channels?part=id,snippet&forHandle={handle}&key={yt_api_key}"
            r = await client.get(search_url)
            data = r.json()
            if not data.get("items"):
                raise HTTPException(status_code=404, detail="Channel not found")
            channel = data["items"][0]
            channel_id = channel["id"]
            channel_name = channel["snippet"]["title"]
            channel_handle = channel["snippet"].get("customUrl", "").lstrip("@") or handle
            
        else:
            raise HTTPException(status_code=400, detail="Invalid YouTube channel or video input")

        # Get uploads playlist
        channel_detail_url = (
            f"https://www.googleapis.com/youtube/v3/channels"
            f"?part=contentDetails&id={channel_id}&key={yt_api_key}"
        )
        r2 = await client.get(channel_detail_url)
        detail = r2.json()
        uploads_playlist = detail["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]

        # Fetch up to max_videos recent videos (plan-gated), handling pagination for >50
        max_videos_to_fetch = min(request.max_videos or 50, 200)  # Cap at 200
        
        playlist_items = []
        next_page_token = ""
        
        while len(playlist_items) < max_videos_to_fetch:
            fetch_count = min(50, max_videos_to_fetch - len(playlist_items))
            page_token_param = f"&pageToken={next_page_token}" if next_page_token else ""
            playlist_url = (
                f"https://www.googleapis.com/youtube/v3/playlistItems"
                f"?part=snippet&playlistId={uploads_playlist}&maxResults={fetch_count}{page_token_param}&key={yt_api_key}"
            )
            r3 = await client.get(playlist_url)
            playlist_data = r3.json()
            items = playlist_data.get("items", [])
            if not items:
                break
            playlist_items.extend(items)
            next_page_token = playlist_data.get("nextPageToken")
            if not next_page_token:
                break

        videos = []
        all_links = []
        url_pattern = re.compile(r'https?://[^\s\)\]\>\"\']+')

        for item in playlist_items:
            snippet = item["snippet"]
            video_id = snippet["resourceId"]["videoId"]
            title = snippet["title"]
            description = snippet.get("description", "")
            view_count = 0  # Would need separate API call for stats

            # Extract URLs from description
            found_urls = url_pattern.findall(description)
            clean_urls = [u.rstrip(".,;)") for u in found_urls]

            for url in clean_urls:
                if "youtube.com" not in url and "youtu.be" not in url:
                    all_links.append({
                        "url": url,
                        "anchor_text": url,
                        "context": f"Video: {title}",
                        "video_id": video_id,
                        "video_title": title,
                    })

            videos.append({
                "video_id": video_id,
                "title": title,
                "link_count": len(clean_urls),
            })

        # Check all extracted links in parallel
        tasks = []
        async with httpx.AsyncClient(
            limits=httpx.Limits(max_connections=20),
            timeout=httpx.Timeout(12.0)
        ) as link_client:
            tasks = [check_single_link(link_client, link) for link in all_links[:2000]]
            results = await asyncio.gather(*tasks, return_exceptions=True)

        valid_results = [r for r in results if isinstance(r, LinkResult)]
        broken = [r for r in valid_results if r.status in ("broken", "out_of_stock")]
        ok_links = [r for r in valid_results if r.status == "ok"]
        redirect_links = [r for r in valid_results if r.status == "redirect"]
        timeout_links = [r for r in valid_results if r.status == "timeout"]
        broken = await get_ai_suggestions(broken)

        # Helper: find source video for a URL
        def find_video(url: str):
            for l in all_links:
                if l["url"] == url:
                    return l.get("video_id", "unknown"), l.get("video_title", "Unknown")
            return "unknown", "Unknown"

        # Group broken links by video
        broken_by_video = {}
        for r in broken:
            vid_id, vid_title = find_video(r.url)
            if vid_id not in broken_by_video:
                broken_by_video[vid_id] = {"title": vid_title, "broken_links": []}
            broken_by_video[vid_id]["broken_links"].append(r.dict())

        # Build all-links-by-video for complete table
        all_by_video = {}
        for r in valid_results:
            vid_id, vid_title = find_video(r.url)
            if vid_id not in all_by_video:
                all_by_video[vid_id] = {"title": vid_title, "links": []}
            all_by_video[vid_id]["links"].append(r.dict())

        # Save to DB if user_id is provided and Supabase is configured
        total_estimated_loss = len(broken) * 800
        if request.user_id and supabase_client:
            try:
                supabase_client.table("scans").insert({
                    "user_id": request.user_id,
                    "page_url": f"https://youtube.com/{channel_handle}",
                    "total_links": len(valid_results),
                    "broken_count": len(broken),
                    "ok_count": len(ok_links),
                    "redirect_count": len(redirect_links),
                    "timeout_count": len(timeout_links),
                    "estimated_loss": total_estimated_loss
                }).execute()
            except Exception as e:
                print(f"Error saving youtube scan to DB: {e}")

        return {
            "channel": {"id": channel_id, "name": channel_name, "handle": channel_handle},
            "summary": {
                "videos_scanned": len(videos),
                "total_links_checked": len(valid_results),
                "broken_links": len(broken),
                "ok_links": len(ok_links),
                "redirect_links": len(redirect_links),
                "timeout_links": len(timeout_links),
                "estimated_monthly_loss_inr": total_estimated_loss,
            },
            "broken_by_video": broken_by_video,
            "all_by_video": all_by_video,
            "scanned_at": datetime.utcnow().isoformat(),
        }

@app.post("/api/stripe/create-checkout")
async def create_checkout(data: dict):
    """Create Stripe checkout session for subscription."""
    plan = data.get("plan", "starter")
    user_id = data.get("user_id")
    email = data.get("email")

    price_ids = {
        "starter": os.getenv("STRIPE_STARTER_PRICE_ID", "price_starter"),
        "pro": os.getenv("STRIPE_PRO_PRICE_ID", "price_pro"),
        "agency": os.getenv("STRIPE_AGENCY_PRICE_ID", "price_agency"),
    }

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            mode="subscription",
            customer_email=email,
            line_items=[{"price": price_ids[plan], "quantity": 1}],
            success_url=f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/dashboard?success=true",
            cancel_url=f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/pricing",
            metadata={"user_id": user_id or ""},
        )
        return {"checkout_url": session.url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/stripe/webhook")
async def stripe_webhook(request_body: bytes, stripe_signature: str = Header(None)):
    """Handle Stripe webhook events to update user subscription status."""
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    try:
        event = stripe.Webhook.construct_event(request_body, stripe_signature, webhook_secret)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid webhook")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session["metadata"].get("user_id")
        # TODO: Update Supabase user subscription status
        # supabase.table("users").update({"plan": "pro", "subscription_id": session["subscription"]}).eq("id", user_id).execute()

    return {"received": True}

@app.get("/api/plans")
async def get_plans():
    return {
        "plans": [
            {
                "id": "starter",
                "name": "Starter",
                "price_inr": 499,
                "price_usd": 6,
                "features": [
                    "50 link scans/day",
                    "Chrome extension access",
                    "Basic broken link detection",
                    "Email alerts",
                    "1 website monitored",
                ],
                "cta": "Start Free Trial",
            },
            {
                "id": "pro",
                "name": "Pro",
                "price_inr": 999,
                "price_usd": 12,
                "features": [
                    "Unlimited link scans",
                    "YouTube channel scanner",
                    "AI replacement suggestions",
                    "Amazon out-of-stock detection",
                    "Weekly auto-monitoring",
                    "5 websites + 3 YouTube channels",
                    "WhatsApp/Email alerts",
                ],
                "cta": "Get Pro",
                "popular": True,
            },
            {
                "id": "agency",
                "name": "Agency",
                "price_inr": 2999,
                "price_usd": 36,
                "features": [
                    "Everything in Pro",
                    "Unlimited websites & channels",
                    "White-label reports",
                    "Team seats (5 users)",
                    "Priority support",
                    "API access",
                ],
                "cta": "Contact Sales",
            },
        ]
    }

# ─── User Dashboard DB Endpoints ──────────────────────────────────────────

@app.get("/api/users/stats")
async def get_user_stats(user_id: str = Depends(get_user_id)):
    if not supabase_client or user_id == "mock_user_id":
        return {
            "total_scans": 12, "total_links_checked": 342, "total_broken_found": 17,
            "estimated_monthly_loss_inr": 8500, "plan": "pro", "monitored_sites_count": 2,
            "last_scan_at": datetime.utcnow().isoformat()
        }
    
    # Fetch real stats from DB
    try:
        user_res = supabase_client.table("users").select("plan").eq("id", user_id).execute()
        plan = user_res.data[0]["plan"] if user_res.data else "free"
        
        scans_res = supabase_client.table("scans").select("*").eq("user_id", user_id).execute()
        sites_res = supabase_client.table("monitored_sites").select("id", count="exact").eq("user_id", user_id).execute()
        
        scans = scans_res.data
        sites_count = sites_res.count if sites_res.count is not None else 0
        
        total_scans = len(scans)
        total_links = sum(s.get("total_links", 0) for s in scans)
        total_broken = sum(s.get("broken_count", 0) for s in scans)
        est_loss = sum(s.get("estimated_loss", 0) for s in scans)
        last_scan = max([s.get("created_at") for s in scans]) if scans else None

        return {
            "total_scans": total_scans,
            "total_links_checked": total_links,
            "total_broken_found": total_broken,
            "estimated_monthly_loss_inr": est_loss,
            "plan": plan,
            "monitored_sites_count": sites_count,
            "last_scan_at": last_scan
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/users/scans")
async def get_user_scans(user_id: str = Depends(get_user_id)):
    if not supabase_client or user_id == "mock_user_id":
        return {
            "total": 0,
            "scans": []
        }
    try:
        res = supabase_client.table("scans").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(50).execute()
        return {
            "total": len(res.data),
            "scans": res.data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/users/monitored-sites")
async def add_monitored_site(data: dict, user_id: str = Depends(get_user_id)):
    if not supabase_client or user_id == "mock_user_id":
        return {"status": "success"}
    try:
        supabase_client.table("monitored_sites").insert({
            "user_id": user_id,
            "url": data.get("url"),
            "name": data.get("name")
        }).execute()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/users/monitored-sites")
async def get_monitored_sites(user_id: str = Depends(get_user_id)):
    if not supabase_client or user_id == "mock_user_id":
        return {"sites": []}
    try:
        res = supabase_client.table("monitored_sites").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        return {"sites": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/users/monitored-sites/{site_id}")
async def delete_monitored_site(site_id: str, user_id: str = Depends(get_user_id)):
    if not supabase_client or user_id == "mock_user_id":
        return {"status": "success"}
    try:
        supabase_client.table("monitored_sites").delete().eq("id", site_id).eq("user_id", user_id).execute()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/users/settings")
async def update_settings(data: dict, user_id: str = Depends(get_user_id)):
    if not supabase_client or user_id == "mock_user_id":
        return {"status": "success"}
    try:
        supabase_client.table("users").update(data).eq("id", user_id).execute()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
