from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["plans"])

PLANS = [
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


@router.get("/plans")
async def get_plans():
    return {"plans": PLANS}
