import os
import re
import asyncio
import httpx
from fastapi import APIRouter, HTTPException
from app.models.schemas import YouTubeRequest, LinkResult
from app.services.link_checker import check_single_link
from app.services.ai_suggestions import get_ai_suggestions
from app.logging_config import logger

router = APIRouter(prefix="/api", tags=["youtube"])

URL_PATTERN = re.compile(r"https?://[^\s\)\]\>\"\']+")


@router.post("/check-youtube-channel")
async def check_youtube_channel(request: YouTubeRequest):
    yt_api_key = os.getenv("YOUTUBE_API_KEY", "")
    if not yt_api_key:
        logger.logger.error("YouTube API key not configured")
        raise HTTPException(status_code=503, detail="YouTube API not configured")

    channel_handle = request.channel_handle.strip().lstrip("@")
    logger.log_youtube_start(channel_handle)

    async with httpx.AsyncClient(timeout=15.0) as client:
        logger.logger.debug("Resolving channel handle: %s", channel_handle)
        search_url = (
            f"https://www.googleapis.com/youtube/v3/channels"
            f"?part=id,snippet&forHandle={channel_handle}&key={yt_api_key}"
        )
        r = await client.get(search_url)
        data = r.json()

        if not data.get("items"):
            logger.logger.warning("Channel not found: %s", channel_handle)
            raise HTTPException(status_code=404, detail="Channel not found")

        channel = data["items"][0]
        channel_id = channel["id"]
        channel_name = channel["snippet"]["title"]
        logger.logger.info("Found channel: %s (id=%s)", channel_name, channel_id)

        detail_url = (
            f"https://www.googleapis.com/youtube/v3/channels"
            f"?part=contentDetails&id={channel_id}&key={yt_api_key}"
        )
        r2 = await client.get(detail_url)
        uploads_playlist = r2.json()["items"][0][
            "contentDetails"]["relatedPlaylists"]["uploads"]
        logger.logger.debug("Uploads playlist: %s", uploads_playlist)

        playlist_url = (
            f"https://www.googleapis.com/youtube/v3/playlistItems"
            f"?part=snippet&playlistId={uploads_playlist}"
            f"&maxResults=50&key={yt_api_key}"
        )
        r3 = await client.get(playlist_url)
        playlist_data = r3.json()

    videos = []
    all_links = []
    seen_urls = set()

    for item in playlist_data.get("items", []):
        snippet = item["snippet"]
        video_id = snippet["resourceId"]["videoId"]
        title = snippet["title"]
        description = snippet.get("description", "")

        found_urls = URL_PATTERN.findall(description)
        clean_urls = [u.rstrip(".,;)") for u in found_urls]

        if clean_urls:
            logger.logger.debug("  Video '%s': %d URLs found", title[:40], len(clean_urls))

        for url in clean_urls:
            if "youtube.com" not in url and "youtu.be" not in url and url not in seen_urls:
                seen_urls.add(url)
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

    logger.logger.info("Found %d videos with %d external links total", len(videos), len(all_links))

    results = []
    async with httpx.AsyncClient(
        limits=httpx.Limits(max_connections=20),
        timeout=httpx.Timeout(12.0),
    ) as link_client:
        tasks = [check_single_link(link_client, link) for link in all_links[:200]]
        results = await asyncio.gather(*tasks, return_exceptions=True)

    valid_results = [r for r in results if isinstance(r, LinkResult)]
    for r in valid_results:
        if r.status in ("broken", "out_of_stock", "unverifiable"):
            logger.log_link_check(r.url, r.status, r.status_code, r.ai_suggestion)

    broken = [r for r in valid_results if r.status in ("broken", "out_of_stock")]
    unverifiable = [r for r in valid_results if r.status == "unverifiable"]
    broken = await get_ai_suggestions(broken)

    broken_by_video = {}
    for r in broken:
        video_id = next(
            (l["video_id"] for l in all_links if l["url"] == r.url),
            "unknown",
        )
        video_title = next(
            (l["video_title"] for l in all_links if l["url"] == r.url),
            "Unknown",
        )
        if video_id not in broken_by_video:
            broken_by_video[video_id] = {"title": video_title, "broken_links": []}
        broken_by_video[video_id]["broken_links"].append(r.model_dump())

    loss = len(broken) * 800
    logger.log_youtube_result(len(videos), len(valid_results), len(broken), loss)

    return {
        "channel": {
            "id": channel_id,
            "name": channel_name,
            "handle": channel_handle,
        },
        "summary": {
            "videos_scanned": len(videos),
            "total_links_checked": len(valid_results),
            "broken_links": len(broken),
            "unverifiable_links": len(unverifiable),
            "estimated_monthly_loss_inr": loss,
        },
        "broken_by_video": broken_by_video,
        "unverifiable_links": [r.model_dump() for r in unverifiable],
    }
