import asyncio
import httpx
from fastapi import APIRouter
from app.models.schemas import LinkCheckRequest, LinkResult
from app.services.link_checker import check_single_link
from app.services.ai_suggestions import get_ai_suggestions
from app.database import save_scan_result
from app.logging_config import logger

router = APIRouter(prefix="/api", tags=["links"])


@router.post("/check-links")
async def check_links(request: LinkCheckRequest):
    links = request.links[:100]
    logger.log_scan_start(len(links), request.page_url)

    async with httpx.AsyncClient(
        limits=httpx.Limits(max_connections=30, max_keepalive_connections=10),
        timeout=httpx.Timeout(15.0),
    ) as client:
        tasks = [check_single_link(client, link) for link in links]
        results = await asyncio.gather(*tasks, return_exceptions=True)

    valid_results: list[LinkResult] = [
        r for r in results if isinstance(r, LinkResult)
    ]

    for r in valid_results:
        if r.status in ("broken", "out_of_stock", "redirect"):
            logger.log_link_check(r.url, r.status, r.status_code, r.ai_suggestion)

    broken = [r for r in valid_results if r.status in ("broken", "out_of_stock", "timeout")]
    ok = [r for r in valid_results if r.status == "ok"]
    unverifiable = [r for r in valid_results if r.status == "unverifiable"]
    redirects = [r for r in valid_results if r.status == "redirect"]

    broken = await get_ai_suggestions(broken)

    total_estimated_loss = len(broken) * 500
    logger.log_scan_result(len(valid_results), len(broken), len(ok), len(redirects), total_estimated_loss)

    response = {
        "summary": {
            "total": len(valid_results),
            "broken": len(broken),
            "ok": len(ok),
            "unverifiable": len(unverifiable),
            "redirects": len(redirects),
            "estimated_monthly_loss_inr": total_estimated_loss,
            "scanned_url": request.page_url,
        },
        "broken_links": [r.model_dump() for r in broken],
        "ok_links": [r.model_dump() for r in ok],
        "unverifiable_links": [r.model_dump() for r in unverifiable],
        "redirect_links": [r.model_dump() for r in redirects],
    }

    if request.user_id:
        try:
            await save_scan_result(
                request.user_id, request.page_url,
                response["summary"],
                response["broken_links"],
                response["ok_links"],
                response["redirect_links"],
                response.get("unverifiable_links"),
            )
            logger.logger.debug("Saved scan result to DB for user=%s", request.user_id)
        except Exception as e:
            logger.logger.warning("Failed to save scan to DB: %s", e)

    return response
