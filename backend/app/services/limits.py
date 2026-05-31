from fastapi import HTTPException
from app.database import get_supabase
from app.logging_config import logger

def check_scan_limits(user_id: str | None, device_id: str | None, ip_address: str | None):
    limit = 2
    supabase = get_supabase()

    plan = "free"
    if user_id:
        try:
            user_r = supabase.table("users").select("plan").eq("id", user_id).maybe_single().execute()
            if user_r and user_r.data:
                plan = user_r.data.get("plan", "free")
        except Exception as e:
            logger.logger.error("Failed to check user plan: %s", e)
            
    if plan != "free":
        return

    if user_id:
        try:
            res = supabase.table("scans").select("id", count="exact").eq("user_id", user_id).limit(1).execute()
            count = res.count or 0
        except Exception as e:
            logger.logger.error("Failed to check user scan limits: %s", e)
            count = 0
    else:
        or_conds = []
        if device_id:
            or_conds.append(f"device_id.eq.{device_id}")
        if ip_address:
            or_conds.append(f"ip_address.eq.{ip_address}")
            
        if not or_conds:
            return
            
        or_str = ",".join(or_conds)
        
        try:
            res = supabase.table("scans").select("id", count="exact").or_(or_str).limit(1).execute()
            count = res.count or 0
        except Exception as e:
            logger.logger.error("Failed to check anon scan limits: %s", e)
            count = 0
            
    try:
        
        if count >= limit:
            logger.logger.info("Scan limit reached for user %s, device %s, IP %s. Count: %d", user_id, device_id, ip_address, count)
            raise HTTPException(status_code=402, detail="SCAN_LIMIT_REACHED")
    except HTTPException:
        raise
    except Exception as e:
        logger.logger.error("Failed to check scan limits: %s", e)
