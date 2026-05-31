from pydantic import BaseModel
from typing import Optional


class LinkCheckItem(BaseModel):
    url: str
    anchor_text: str = ""
    context: str = ""


class LinkCheckRequest(BaseModel):
    links: list[LinkCheckItem]
    page_url: str
    user_id: Optional[str] = None
    device_id: Optional[str] = None


class YouTubeRequest(BaseModel):
    channel_handle: str
    user_id: Optional[str] = None
    device_id: Optional[str] = None
    max_videos: Optional[int] = 5


class LinkResult(BaseModel):
    url: str
    anchor_text: str
    context: str
    status: str
    status_code: Optional[int] = None
    final_url: Optional[str] = None
    error: Optional[str] = None
    ai_suggestion: Optional[str] = None
    estimated_loss: Optional[str] = None
    page_title: Optional[str] = None


class CreateCheckoutRequest(BaseModel):
    plan: str = "basic"
    billing: str = "monthly"
    user_id: Optional[str] = None
    email: Optional[str] = None


class Plan(BaseModel):
    id: str
    name: str
    price_inr: int
    price_usd: int
    features: list[str]
    cta: str
    popular: bool = False
