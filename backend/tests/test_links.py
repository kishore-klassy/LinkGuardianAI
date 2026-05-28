import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.fixture
def client():
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


@pytest.mark.asyncio
async def test_health():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_plans():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/plans")
    assert response.status_code == 200
    data = response.json()
    assert len(data["plans"]) == 3
    assert data["plans"][0]["id"] == "starter"
    assert data["plans"][1]["id"] == "pro"
    assert data["plans"][2]["id"] == "agency"


@pytest.mark.asyncio
async def test_check_links_valid():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post(
            "/api/check-links",
            json={
                "links": [
                    {"url": "https://httpbin.org/status/200", "anchor_text": "test", "context": "test page"},
                    {"url": "https://httpbin.org/status/404", "anchor_text": "broken", "context": "test page"},
                ],
                "page_url": "https://example.com",
            },
        )
    assert response.status_code == 200
    data = response.json()
    assert data["summary"]["total"] == 2
    assert data["summary"]["broken"] >= 1


@pytest.mark.asyncio
async def test_check_links_empty():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post(
            "/api/check-links",
            json={"links": [], "page_url": "https://example.com"},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["summary"]["total"] == 0


@pytest.mark.asyncio
async def test_check_links_invalid_url():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post(
            "/api/check-links",
            json={
                "links": [{"url": "not-a-url", "anchor_text": "test", "context": "test"}],
                "page_url": "https://example.com",
            },
        )
    assert response.status_code == 200
    data = response.json()
    assert data["summary"]["total"] == 1
    assert data["summary"]["broken"] == 0
