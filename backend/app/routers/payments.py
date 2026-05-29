import os
import hmac
import hashlib
import razorpay
from fastapi import APIRouter, HTTPException, Request
from app.database import update_user_subscription
from app.models.schemas import CreateCheckoutRequest
from app.logging_config import logger

router = APIRouter(prefix="/api/payments", tags=["payments"])

# Initialize Razorpay Client
razorpay_key = os.getenv("RAZORPAY_KEY_ID", "")
razorpay_secret = os.getenv("RAZORPAY_KEY_SECRET", "")

if razorpay_key and razorpay_secret:
    rzp = razorpay.Client(auth=(razorpay_key, razorpay_secret))
else:
    rzp = None

# Pricing logic (in INR)
PRICING = {
    "basic": 499,
    "pro": 999
}

@router.post("/create-order")
async def create_order(data: CreateCheckoutRequest):
    if not rzp:
        raise HTTPException(status_code=500, detail="Razorpay keys not configured")

    if data.plan not in PRICING:
        raise HTTPException(status_code=400, detail="Invalid plan")

    base_price = PRICING[data.plan]
    if data.billing == "annual":
        final_price = int(base_price * 12 * 0.8) # 20% discount
    else:
        final_price = base_price

    amount_in_paise = final_price * 100
    if amount_in_paise < 100:
        raise HTTPException(status_code=400, detail="Amount too small")

    try:
        # Create an Order
        order = rzp.order.create({
            "amount": amount_in_paise,
            "currency": "INR",
            "receipt": f"rcpt_{str(data.user_id)[:20] if data.user_id else 'anon'}_{data.plan}"[:40],
            "notes": {
                "user_id": data.user_id or "",
                "email": data.email or "",
                "plan": data.plan,
                "billing": data.billing
            }
        })
        return {
            "order_id": order["id"],
            "amount": amount_in_paise,
            "currency": "INR",
            "razorpay_key": razorpay_key
        }
    except Exception as e:
        logger.logger.error("Razorpay order creation failed: %s", e)
        raise HTTPException(status_code=500, detail="Failed to create Razorpay order")


@router.post("/verify")
async def verify_payment(request: Request):
    if not rzp:
        raise HTTPException(status_code=500, detail="Razorpay keys not configured")
        
    data = await request.json()
    
    razorpay_payment_id = data.get("razorpay_payment_id")
    razorpay_order_id = data.get("razorpay_order_id")
    razorpay_signature = data.get("razorpay_signature")
    user_id = data.get("user_id")
    plan = data.get("plan")

    if not all([razorpay_payment_id, razorpay_order_id, razorpay_signature]):
        raise HTTPException(status_code=400, detail="Missing payment details")

    # Verify signature
    try:
        expected_signature = hmac.new(
            bytes(razorpay_secret, 'utf-8'),
            msg=bytes(razorpay_order_id + "|" + razorpay_payment_id, 'utf-8'),
            digestmod=hashlib.sha256
        ).hexdigest()

        if expected_signature != razorpay_signature:
            raise HTTPException(status_code=400, detail="Invalid signature")
            
        # Fetch order details to get trusted user_id and plan
        order = rzp.order.fetch(razorpay_order_id)
        notes = order.get("notes", {})
        
        # Override frontend provided user_id and plan with trusted ones from the order
        trusted_user_id = notes.get("user_id") or user_id
        trusted_plan = notes.get("plan") or plan

        # If valid, update database
        if trusted_user_id:
            await update_user_subscription(
                user_id=trusted_user_id,
                plan=trusted_plan,
                subscription_id=razorpay_order_id  # Storing order ID as subscription ID for tracking
            )
            
        return {"success": True, "message": "Payment verified successfully"}
    except Exception as e:
        logger.logger.error("Razorpay verification failed: %s", e)
        raise HTTPException(status_code=400, detail="Verification failed")
