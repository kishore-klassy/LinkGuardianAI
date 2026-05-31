import asyncio
import os
from datetime import datetime
import httpx
from bs4 import BeautifulSoup
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.database import get_supabase
from app.logging_config import logger
from app.services.link_checker import check_single_link
from app.models.schemas import YouTubeRequest
from app.routers.youtube import check_youtube_channel
from fastapi import HTTPException

scheduler = AsyncIOScheduler()

async def extract_website_links(url: str, client: httpx.AsyncClient):
    """Extracts all external links from a website's homepage."""
    try:
        r = await client.get(url, timeout=15.0, follow_redirects=True)
        soup = BeautifulSoup(r.text, "html.parser")
        links = []
        seen = set()
        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            if href.startswith("http") and href not in seen:
                # Basic check to avoid self-links if needed, but for now take all absolute HTTP links
                seen.add(href)
                links.append({
                    "url": href,
                    "anchor_text": a.get_text(strip=True)[:100],
                    "context": f"Page: {url}"
                })
        return links
    except Exception as e:
        logger.logger.error("Error extracting links from %s: %s", url, e)
        return []

async def monitor_single_site(site: dict, supabase):
    site_id = site["id"]
    user_id = site["user_id"]
    url = site["url"]
    site_type = site.get("site_type", "website")

    logger.logger.info("Starting background scan for site %s (%s)", url, site_type)

    total_links = 0
    broken_count = 0
    ok_count = 0
    broken_links_list = []

    try:
        if site_type == "youtube":
            # Reuse the existing youtube router logic
            req = YouTubeRequest(channel_handle=url, user_id=user_id, max_videos=10) # 10 videos for background check to be safe
            try:
                res = await check_youtube_channel(req)
                summary = res.get("summary", {})
                total_links = summary.get("total_links_checked", 0)
                broken_count = summary.get("broken_links", 0)
                ok_count = summary.get("total_links_checked", 0) - broken_count - summary.get("unverifiable_links", 0)
                
                # Extract broken links for notification
                broken_by_video = res.get("broken_by_video", {})
                for vid_data in broken_by_video.values():
                    for bl in vid_data.get("broken_links", []):
                        broken_links_list.append(bl)
            except HTTPException as he:
                logger.logger.error("HTTP Exception checking youtube site %s: %s", url, he.detail)
            except Exception as e:
                logger.logger.error("Error checking youtube site %s: %s", url, e)
                
        else:
            # Website logic
            async with httpx.AsyncClient(
                limits=httpx.Limits(max_connections=20),
                timeout=httpx.Timeout(15.0),
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
            ) as client:
                links = await extract_website_links(url, client)
                links = links[:100] # Limit to 100 links per site for background check
                total_links = len(links)
                
                if links:
                    tasks = [check_single_link(client, link) for link in links]
                    results = await asyncio.gather(*tasks, return_exceptions=True)
                    
                    for r in results:
                        if hasattr(r, "status"):
                            if r.status in ("broken", "out_of_stock"):
                                broken_count += 1
                                broken_links_list.append({"url": r.url, "status": r.status})
                            elif r.status == "ok":
                                ok_count += 1

        # Update the site stats
        stats = {
            "total_links": total_links,
            "broken_count": broken_count,
            "ok_count": ok_count
        }
        supabase.table("monitored_sites").update({
            "last_scanned_at": datetime.utcnow().isoformat(),
            "latest_stats": stats
        }).eq("id", site_id).execute()

        # Create notifications for broken links
        if broken_count > 0:
            message = f"Detected {broken_count} broken/out-of-stock links on {url}."
            if broken_links_list:
                sample = broken_links_list[0]["url"]
                message += f" Example: {sample}"

            supabase.table("notifications").insert({
                "user_id": user_id,
                "title": "Broken Links Detected",
                "message": message,
                "type": "alert"
            }).execute()

        logger.logger.info("Finished background scan for site %s. Broken: %d", url, broken_count)

    except Exception as e:
        logger.logger.error("Unhandled error monitoring site %s: %s", url, e)


async def run_daily_monitoring():
    """Fetches all active monitored sites and runs scans."""
    logger.logger.info("Starting daily background monitoring task.")
    supabase = get_supabase()
    
    # Fetch sites that are active (assuming we check all for now)
    try:
        res = supabase.table("monitored_sites").select("*").execute()
        sites = res.data or []
        
        # Process sites sequentially to avoid overloading, or in small batches
        for site in sites:
            await monitor_single_site(site, supabase)
            await asyncio.sleep(2) # Give a small pause between sites
            
    except Exception as e:
        logger.logger.error("Error fetching monitored sites for cron: %s", e)

    logger.logger.info("Completed daily background monitoring task.")


def start_scheduler():
    """Initializes and starts the APScheduler."""
    # Run once a day at 2:00 AM
    scheduler.add_job(run_daily_monitoring, 'cron', hour=2, minute=0, id="daily_monitoring", replace_existing=True)
    scheduler.start()
    logger.logger.info("APScheduler started.")

def stop_scheduler():
    scheduler.shutdown()
    logger.logger.info("APScheduler stopped.")
