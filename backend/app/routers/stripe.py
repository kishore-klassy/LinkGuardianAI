import os
import stripe
from fastapi import APIRouter, HTTPException, Header, Request
from app.database import update_user_subscription
from app.models.schemas import CreateCheckoutRequest

router = APIRouter(prefix="/api/stripe", tags=["stripe"])

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")

PRICE_IDS = {
    "starter": os.getenv("STRIPE_STARTER_PRICE_ID", "price_starter"),
    "pro": os.getenv("STRIPE_PRO_PRICE_ID", "price_pro"),
    "agency": os.getenv("STRIPE_AGENCY_PRICE_ID", "price_agency"),
}


@router.post("/create-checkout")
async def create_checkout(data: CreateCheckoutRequest):
    price_id = PRICE_IDS.get(data.plan)
    if not price_id:
        raise HTTPException(status_code=400, detail="Invalid plan")

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            mode="subscription",
            customer_email=data.email,
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=(
                f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}"
                f"/dashboard?success=true"
            ),
            cancel_url=(
                f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}"
                f"/pricing"
            ),
            metadata={"user_id": data.user_id or ""},
        )
        return {"checkout_url": session.url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature")
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET", "")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig, webhook_secret
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid webhook")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session["metadata"].get("user_id")
        if user_id:
            try:
                await update_user_subscription(
                    user_id=user_id,
                    plan="pro",
                    subscription_id=session.get("subscription", ""),
                )
            except Exception:
                pass

    return {"received": True}
