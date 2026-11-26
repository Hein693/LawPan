import pytest
from app.main import app
from app.db.init_db import init_database
from fastapi.testclient import TestClient

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Ensure database tables and seed data are initialized for testing."""
    init_database()

@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c
