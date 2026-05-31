from fastapi import APIRouter, HTTPException, Header
from app.database import get_supabase
from app.logging_config import logger

router = APIRouter(prefix="/api/users", tags=["users"])


async def get_user_id(authorization: str = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing auth header")
    token = authorization.split(" ")[1]
    supabase = get_supabase()
    try:
        r = supabase.auth.get_user(token)
        return r.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.post("/sync")
async def sync_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing auth header")
    token = authorization.split(" ")[1]
    supabase = get_supabase()
    
    try:
        r = supabase.auth.get_user(token)
        user = r.user
        user_id = user.id
        email = user.email
        full_name = user.user_metadata.get("full_name", "")
        
        # Check if exists
        db_user_r = supabase.table("users").select("id").eq("id", user_id).maybe_single().execute()
        if not db_user_r or not getattr(db_user_r, 'data', None):
            supabase.table("users").insert({
                "id": user_id,
                "email": email,
                "full_name": full_name,
                "plan": "free"
            }).execute()
            logger.logger.info("Synchronized new user %s to DB", user_id)
        else:
            supabase.table("users").update({
                "email": email,
                "full_name": full_name
            }).eq("id", user_id).execute()
            
        return {"status": "success", "user_id": user_id}
    except Exception as e:
        logger.logger.error("Error syncing user: %s", e)
        raise HTTPException(status_code=500, detail="Failed to sync user")


@router.get("/me")
async def get_me(authorization: str = Header(None)):
    user_id = await get_user_id(authorization)
    supabase = get_supabase()
    r = supabase.table("users").select("*").eq("id", user_id).maybe_single().execute()
    if not r or not r.data:
        return {
            "id": user_id,
            "email": None,
            "full_name": None,
            "plan": "free",
            "subscription_id": None,
        }
    return r.data


@router.get("/stats")
async def get_stats(authorization: str = Header(None)):
    user_id = await get_user_id(authorization)
    supabase = get_supabase()

    scans_r = supabase.table("scans").select("*").eq("user_id", user_id).execute()
    scans = scans_r.data or []

    total_scans = len(scans)
    total_links = sum(s.get("total_links", 0) for s in scans)
    total_broken = sum(s.get("broken_count", 0) for s in scans)
    total_loss = sum(s.get("estimated_loss", 0) for s in scans)

    user_r = supabase.table("users").select("plan").eq("id", user_id).maybe_single().execute()
    plan = (user_r.data or {}).get("plan", "free") if user_r else "free"

    sites_r = supabase.table("monitored_sites").select("id").eq("user_id", user_id).execute()
    sites_count = len(sites_r.data or [])

    latest_r = (
        supabase.table("scans")
        .select("created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    last_scan = (latest_r.data or [{}])[0].get("created_at") if latest_r.data else None

    return {
        "total_scans": total_scans,
        "total_links_checked": total_links,
        "total_broken_found": total_broken,
        "estimated_monthly_loss_inr": total_loss,
        "plan": plan,
        "monitored_sites_count": sites_count,
        "last_scan_at": last_scan,
    }


@router.get("/scans")
async def get_scans(
    page: int = 1,
    per_page: int = 20,
    authorization: str = Header(None),
):
    user_id = await get_user_id(authorization)
    supabase = get_supabase()
    start = (page - 1) * per_page
    end = start + per_page - 1

    r = supabase.table("scans").select("*", count="exact")
    r = r.eq("user_id", user_id).order("created_at", desc=True).range(start, end)
    result = r.execute()

    return {
        "scans": result.data or [],
        "total": result.count or 0,
        "page": page,
        "per_page": per_page,
    }


@router.get("/monitored-sites")
async def get_monitored_sites(authorization: str = Header(None)):
    user_id = await get_user_id(authorization)
    supabase = get_supabase()
    r = supabase.table("monitored_sites").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    return {"sites": r.data or []}


@router.post("/monitored-sites")
async def add_monitored_site(data: dict, authorization: str = Header(None)):
    user_id = await get_user_id(authorization)
    url = data.get("url", "").strip()
    name = data.get("name", "").strip() or url
    site_type = data.get("site_type", "website")
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")
    supabase = get_supabase()
    r = supabase.table("monitored_sites").insert({
        "user_id": user_id,
        "url": url,
        "name": name,
        "site_type": site_type,
    }).execute()
    return r.data[0] if r.data else {"ok": True}


@router.delete("/monitored-sites/{site_id}")
async def delete_monitored_site(site_id: str, authorization: str = Header(None)):
    user_id = await get_user_id(authorization)
    supabase = get_supabase()
    supabase.table("monitored_sites").delete().eq("id", site_id).eq("user_id", user_id).execute()
    return {"ok": True}


@router.put("/settings")
async def update_settings(data: dict, authorization: str = Header(None)):
    user_id = await get_user_id(authorization)
    allowed = {"email_alerts", "weekly_report", "whatsapp_alerts", "theme"}
    update = {k: v for k, v in data.items() if k in allowed}
    if not update:
        raise HTTPException(status_code=400, detail="No valid settings provided")
    supabase = get_supabase()
    supabase.table("user_settings").upsert({
        "user_id": user_id, **update,
    }).execute()
    return {"ok": True}


@router.get("/settings")
async def get_settings(authorization: str = Header(None)):
    user_id = await get_user_id(authorization)
    supabase = get_supabase()
    r = supabase.table("user_settings").select("*").eq("user_id", user_id).maybe_single().execute()
    if not r or not r.data:
        return {
            "email_alerts": True,
            "weekly_report": False,
            "whatsapp_alerts": False,
            "theme": "dark",
        }
    return r.data


@router.get("/notifications")
async def get_notifications(authorization: str = Header(None)):
    user_id = await get_user_id(authorization)
    supabase = get_supabase()
    r = supabase.table("notifications").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(50).execute()
    return {"notifications": r.data or []}

@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, authorization: str = Header(None)):
    user_id = await get_user_id(authorization)
    supabase = get_supabase()
    supabase.table("notifications").update({"is_read": True}).eq("id", notification_id).eq("user_id", user_id).execute()
    return {"ok": True}

@router.delete("/notifications/{notification_id}")
async def delete_notification(notification_id: str, authorization: str = Header(None)):
    user_id = await get_user_id(authorization)
    supabase = get_supabase()
    supabase.table("notifications").delete().eq("id", notification_id).eq("user_id", user_id).execute()
    return {"ok": True}

@router.post("/support")
async def submit_support_ticket(data: dict, authorization: str = Header(None)):
    user_id = None
    if authorization and authorization.startswith("Bearer "):
        try:
            user_id = await get_user_id(authorization)
        except Exception:
            pass
            
    topic = data.get("topic", "").strip()
    message = data.get("message", "").strip()
    
    if not topic or not message:
        raise HTTPException(status_code=400, detail="Topic and message are required")
        
    supabase = get_supabase()
    
    try:
        supabase.table("support_tickets").insert({
            "user_id": user_id,
            "topic": topic,
            "message": message,
            "status": "open"
        }).execute()
        return {"ok": True}
    except Exception as e:
        logger.logger.error("Failed to create support ticket: %s", e)
        raise HTTPException(status_code=500, detail="Failed to submit support ticket")
