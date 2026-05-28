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


async def save_scan_result(
    user_id: str | None,
    page_url: str,
    summary: dict,
    broken_links: list,
    ok_links: list,
    redirect_links: list,
    unverifiable_links: list | None = None,
):
    supabase = get_supabase()
    data = {
        "user_id": user_id,
        "page_url": page_url,
        "total_links": summary["total"],
        "broken_count": summary["broken"],
        "ok_count": summary["ok"],
        "unverifiable_count": summary.get("unverifiable", 0),
        "redirect_count": summary["redirects"],
        "estimated_loss": summary.get("estimated_monthly_loss_inr", 0),
        "broken_links_data": broken_links,
        "ok_links_data": ok_links,
        "unverifiable_links_data": unverifiable_links or [],
        "redirect_links_data": redirect_links,
    }
    supabase.table("scans").insert(data).execute()


async def update_user_subscription(user_id: str, plan: str, subscription_id: str):
    supabase = get_supabase()
    supabase.table("users").update(
        {"plan": plan, "subscription_id": subscription_id}
    ).eq("id", user_id).execute()
