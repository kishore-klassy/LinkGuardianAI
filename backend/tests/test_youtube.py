import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_youtube_no_api_key():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post(
            "/api/check-youtube-channel",
            json={"channel_handle": "@test"},
        )
    assert response.status_code == 503
    assert "YouTube API not configured" in response.json()["detail"]
