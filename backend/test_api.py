"""Unit and API integration tests for LeadFlow backend (async with httpx)."""
import pytest
import pytest_asyncio
import httpx
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import models
from database import Base, get_db
from main import app

from sqlalchemy.pool import StaticPool

# In-memory SQLite for isolated tests
TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest_asyncio.fixture
async def client():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_health(client):
    res = await client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_create_lead_success(client):
    payload = {"name": "Test User", "company": "Acme Inc", "phone": "123-456"}
    res = await client.post("/api/leads", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Test User"
    assert data["company"] == "Acme Inc"
    assert data["phone"] == "123-456"
    assert data["status"] == "New"
    assert data["discussions_count"] == 1
    assert data["last_note"] == "Lead created."


@pytest.mark.asyncio
async def test_create_lead_validation_error(client):
    # Empty name should fail with 422
    res = await client.post("/api/leads", json={"name": "   "})
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_list_leads_and_filters(client):
    await client.post("/api/leads", json={"name": "Alice Corp", "company": "Tech"})
    await client.post("/api/leads", json={"name": "Bob Ltd", "company": "Finance"})

    res = await client.get("/api/leads")
    assert res.status_code == 200
    assert len(res.json()) == 2

    # Search filter
    search_res = await client.get("/api/leads?search=Alice")
    assert search_res.status_code == 200
    assert len(search_res.json()) == 1
    assert search_res.json()[0]["name"] == "Alice Corp"


@pytest.mark.asyncio
async def test_get_lead_detail(client):
    created_res = await client.post("/api/leads", json={"name": "Charlie"})
    lead_id = created_res.json()["id"]

    res = await client.get(f"/api/leads/{lead_id}")
    assert res.status_code == 200
    detail = res.json()
    assert detail["name"] == "Charlie"
    assert len(detail["discussions"]) == 1


@pytest.mark.asyncio
async def test_update_lead_status(client):
    created_res = await client.post("/api/leads", json={"name": "Diana"})
    lead_id = created_res.json()["id"]

    # Valid status
    patch_res = await client.patch(f"/api/leads/{lead_id}", json={"status": "Contacted"})
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "Contacted"

    # Invalid status should return 400
    bad_res = await client.patch(f"/api/leads/{lead_id}", json={"status": "InvalidStatus"})
    assert bad_res.status_code == 400


@pytest.mark.asyncio
async def test_add_discussion_and_follow_up_update(client):
    created_res = await client.post("/api/leads", json={"name": "Evan"})
    lead_id = created_res.json()["id"]

    follow_up_time = "2026-10-20T14:00:00"
    disc_res = await client.post(
        f"/api/leads/{lead_id}/discussions",
        json={"note": "Had a great intro call.", "follow_up_at": follow_up_time},
    )
    assert disc_res.status_code == 201

    # Check that lead's follow_up_at was updated
    lead_res = await client.get(f"/api/leads/{lead_id}")
    assert lead_res.status_code == 200
    assert lead_res.json()["follow_up_at"] is not None
    assert lead_res.json()["last_note"] == "Had a great intro call."


@pytest.mark.asyncio
async def test_delete_lead(client):
    created_res = await client.post("/api/leads", json={"name": "Frank"})
    lead_id = created_res.json()["id"]

    del_res = await client.delete(f"/api/leads/{lead_id}")
    assert del_res.status_code == 204

    # Now 404
    get_res = await client.get(f"/api/leads/{lead_id}")
    assert get_res.status_code == 404
