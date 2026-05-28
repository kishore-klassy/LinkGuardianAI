from supabase import create_client, Client
from app.config import settings


_supabase: Client | None = None


def get_supabase() -> Client:
    global _supabase
    if _supabase is None:
        _supabase = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key,
        )
    return _supabase


def ensure_user_exists(user_id: str):
    if not user_id:
        return
    supabase = get_supabase()
    
    r = None
    try:
        r = supabase.table("users").select("id").eq("id", user_id).maybe_single().execute()
    except Exception as e:
        error_str = str(e)
        if "'code': '204'" not in error_str and "Missing response" not in error_str:
            app_logger.logger.warning(f"Error checking user existence: {e}")
            
    if not r or not getattr(r, 'data', None):
        try:
            supabase.table("users").insert({
                "id": user_id,
                "email": f"{user_id}@placeholder.expirelinkx.com",
                "plan": "free"
            }).execute()
        except Exception as e:
            error_str = str(e)
            if "'code': '204'" not in error_str and "Missing response" not in error_str:
                app_logger.logger.error(f"Failed to ensure user exists: {e}")


from app.logging_config import logger as app_logger

async def save_scan_result(
    user_id: str | None,
    page_url: str,
    summary: dict,
    broken_links: list,
    ok_links: list,
    redirect_links: list,
    unverifiable_links: list | None = None,
):
    ensure_user_exists(user_id)
    app_logger.logger.info(f"==== DB INSERT INITIATED: save_scan_result for user_id={user_id} ====")
    app_logger.logger.debug(f"Target URL: {page_url}")
    supabase = get_supabase()
    data = {
        "user_id": user_id,
        "page_url": page_url,
        "total_links": summary.get("total", 0),
        "broken_count": summary.get("broken", 0),
        "ok_count": summary.get("ok", 0),
        "timeout_count": summary.get("unverifiable", 0),
        "redirect_count": summary.get("redirects", 0),
        "estimated_loss": summary.get("estimated_monthly_loss_inr", 0),
        "broken_links_data": broken_links,
        "ok_links_data": ok_links,
        "unverifiable_links_data": unverifiable_links or [],
        "redirect_links_data": redirect_links,
    }
    app_logger.logger.debug(f"Prepared Data Payload for 'scans' table: {data}")
    
    try:
        app_logger.logger.info("Executing Supabase insert...")
        res = supabase.table("scans").insert(data).execute()
        app_logger.logger.info(f"==== DB INSERT SUCCESS: Response Data: {res.data} ====")
    except Exception as e:
        error_str = str(e)
        if "'code': '204'" in error_str or "Missing response" in error_str:
            app_logger.logger.info("==== DB INSERT SUCCESS (Empty 204 Response) ====")
        else:
            app_logger.logger.error(f"==== DB INSERT FAILED: Error: {error_str} ====", exc_info=True)
            raise e


async def update_user_subscription(user_id: str, plan: str, subscription_id: str):
    supabase = get_supabase()
    supabase.table("users").update(
        {"plan": plan, "subscription_id": subscription_id}
    ).eq("id", user_id).execute()
