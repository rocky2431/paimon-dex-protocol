"""
Pytest configuration and fixtures for testing.
"""

import pytest
import pytest_asyncio
from datetime import datetime, UTC
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.core.database import get_db
from app.models.base import Base
from app.main import app
from app.models.user import User


# Test database URL (SQLite in-memory for tests)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def test_engine():
    """Create test database engine."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
        future=True,
    )

    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    # Drop all tables after tests
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest_asyncio.fixture
async def test_db(test_engine):
    """Create test database session factory."""
    async_session_factory = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with async_session_factory() as session:
        yield session
        # Rollback any uncommitted changes
        await session.rollback()


@pytest_asyncio.fixture
async def async_client(test_db):
    """Create async test client with shared database session."""
    # Override get_db dependency to return a generator that yields the test_db
    async def override_get_db():
        yield test_db

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    # Clear dependency overrides
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_user(test_db):
    """Create a test user and ensure it's committed."""
    user = User(
        address="0x1234567890abcdef1234567890abcdef12345678",
        referral_code="TEST1234",
    )
    test_db.add(user)
    await test_db.flush()  # Flush to get ID without committing
    await test_db.commit()  # Commit the transaction
    await test_db.refresh(user)  # Refresh to ensure object is up-to-date

    # Ensure the session is in a clean state for subsequent operations
    await test_db.expire_all()

    return user
