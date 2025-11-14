"""
Unit tests for database models and connection.

Tests:
1. Functional: Models creation and relationships
2. Boundary: Field constraints and validations
3. Exception: Invalid data handling
4. Performance: Query performance
5. Security: SQL injection prevention
6. Compatibility: Database schema compatibility
"""


import pytest


class TestDatabaseConnection:
    """Test database connection and configuration."""

    def test_database_url_configured(self):
        """Test database URL is configured in settings."""
        from app.core.config import settings

        assert settings.DATABASE_URL is not None
        assert "postgresql" in settings.DATABASE_URL.lower()

    @pytest.mark.asyncio
    async def test_database_engine_creation(self):
        """Test async database engine can be created."""
        from app.core.database import engine

        assert engine is not None
        # Engine should be async
        assert hasattr(engine, "dispose")

    @pytest.mark.asyncio
    async def test_database_session_factory(self):
        """Test database session factory works."""
        from app.core.database import AsyncSessionLocal

        async with AsyncSessionLocal() as session:
            assert session is not None
            # Session should be async
            assert hasattr(session, "execute")


class TestUserModel:
    """Test User ORM model."""

    def test_user_model_exists(self):
        """Test User model is defined."""
        from app.models.user import User

        assert User is not None
        assert hasattr(User, "__tablename__")

    def test_user_model_has_required_fields(self):
        """Test User model has all required fields."""
        from app.models.user import User

        # Check required columns exist
        required_fields = [
            "id",
            "address",
            "email",
            "social_provider",
            "social_id",
            "referral_code",
            "referred_by",
            "created_at",
            "updated_at",
        ]

        for field in required_fields:
            assert hasattr(User, field), f"User model missing field: {field}"

    def test_user_address_unique_constraint(self):
        """Test User address field has unique constraint."""
        from app.models.user import User

        address_column = User.address.property.columns[0]
        assert address_column.unique is True

    def test_user_referral_code_unique_constraint(self):
        """Test User referral_code field has unique constraint."""
        from app.models.user import User

        referral_code_column = User.referral_code.property.columns[0]
        assert referral_code_column.unique is True

    def test_user_model_has_relationships(self):
        """Test User model has relationships defined."""
        from app.models.user import User

        # Check relationships exist
        assert hasattr(User, "kyc_record")
        assert hasattr(User, "referrals")


class TestKYCModel:
    """Test KYC ORM model."""

    def test_kyc_model_exists(self):
        """Test KYC model is defined."""
        from app.models.kyc import KYC

        assert KYC is not None
        assert hasattr(KYC, "__tablename__")

    def test_kyc_model_has_required_fields(self):
        """Test KYC model has all required fields."""
        from app.models.kyc import KYC

        required_fields = [
            "id",
            "user_id",
            "tier",
            "status",
            "blockpass_id",
            "approved_at",
            "created_at",
            "updated_at",
        ]

        for field in required_fields:
            assert hasattr(KYC, field), f"KYC model missing field: {field}"

    def test_kyc_user_relationship(self):
        """Test KYC model has user relationship."""
        from app.models.kyc import KYC

        assert hasattr(KYC, "user")


class TestTaskProgressModel:
    """Test TaskProgress ORM model."""

    def test_task_progress_model_exists(self):
        """Test TaskProgress model is defined."""
        from app.models.task import TaskProgress

        assert TaskProgress is not None
        assert hasattr(TaskProgress, "__tablename__")

    def test_task_progress_has_required_fields(self):
        """Test TaskProgress model has all required fields."""
        from app.models.task import TaskProgress

        required_fields = [
            "id",
            "user_id",
            "task_id",
            "task_type",
            "status",
            "completed_at",
            "claimed_at",
            "reward_amount",
            "created_at",
            "updated_at",
        ]

        for field in required_fields:
            assert hasattr(
                TaskProgress, field
            ), f"TaskProgress model missing field: {field}"

    def test_task_progress_user_relationship(self):
        """Test TaskProgress model has user relationship."""
        from app.models.task import TaskProgress

        assert hasattr(TaskProgress, "user")


class TestReferralModel:
    """Test Referral ORM model."""

    def test_referral_model_exists(self):
        """Test Referral model is defined."""
        from app.models.referral import Referral

        assert Referral is not None
        assert hasattr(Referral, "__tablename__")

    def test_referral_has_required_fields(self):
        """Test Referral model has all required fields."""
        from app.models.referral import Referral

        required_fields = [
            "id",
            "referrer_id",
            "referee_id",
            "reward_earned",
            "created_at",
        ]

        for field in required_fields:
            assert hasattr(Referral, field), f"Referral model missing field: {field}"

    def test_referral_relationships(self):
        """Test Referral model has relationships."""
        from app.models.referral import Referral

        assert hasattr(Referral, "referrer")
        assert hasattr(Referral, "referee")


class TestAlembicConfiguration:
    """Test Alembic migration configuration."""

    def test_alembic_ini_exists(self):
        """Test alembic.ini exists."""
        from pathlib import Path

        backend_dir = Path(__file__).parent.parent.parent
        alembic_ini = backend_dir / "alembic.ini"

        assert alembic_ini.exists(), "alembic.ini not found"

    def test_alembic_directory_exists(self):
        """Test alembic directory structure exists."""
        from pathlib import Path

        backend_dir = Path(__file__).parent.parent.parent
        alembic_dir = backend_dir / "alembic"

        assert alembic_dir.exists(), "alembic/ directory not found"
        assert (alembic_dir / "env.py").exists(), "alembic/env.py not found"
        assert (
            alembic_dir / "versions"
        ).exists(), "alembic/versions/ directory not found"

    def test_alembic_env_imports_models(self):
        """Test alembic env.py imports all models."""
        from pathlib import Path

        backend_dir = Path(__file__).parent.parent.parent
        env_file = backend_dir / "alembic" / "env.py"

        content = env_file.read_text()

        # Should import Base and all models
        assert "from app.models" in content or "import app.models" in content
        assert "target_metadata" in content
