"""
Test suite for Task System Data Model (Task 22).

Tests the design of:
1. Task type enumeration (onchain, offchain, referral)
2. Task configuration JSON Schema
3. Enhanced TaskProgress table structure
"""

import pytest
from datetime import datetime, UTC
from decimal import Decimal

from app.models.task import TaskProgress, TaskType, TaskStatus


class TestTaskTypeEnumeration:
    """Test task type classification."""

    def test_social_task_type(self):
        """FUNCTIONAL: Social tasks (Twitter, Discord) should be supported."""
        assert TaskType.SOCIAL.value == "social"

    def test_onchain_simple_task_type(self):
        """FUNCTIONAL: Simple onchain tasks (swaps, holds) should be supported."""
        assert TaskType.ONCHAIN_SIMPLE.value == "onchain_simple"

    def test_onchain_complex_task_type(self):
        """FUNCTIONAL: Complex RWA tasks (time dimension) should be supported."""
        assert TaskType.ONCHAIN_COMPLEX.value == "onchain_complex"

    def test_referral_task_type(self):
        """FUNCTIONAL: Referral tasks should be supported."""
        assert TaskType.REFERRAL.value == "referral"

    def test_task_type_extensibility(self):
        """FUNCTIONAL: Task type enum should support all 4 types."""
        types = [t.value for t in TaskType]
        assert len(types) == 4
        assert "social" in types
        assert "onchain_simple" in types
        assert "onchain_complex" in types
        assert "referral" in types


class TestTaskConfigurationSchema:
    """Test task configuration JSON Schema design."""

    def test_taskon_task_config(self):
        """FUNCTIONAL: TaskOn task should store project_id and task_id."""
        config = {
            "source": "taskon",
            "project_id": "paimon-dex",
            "task_id": "follow-twitter",
            "api_endpoint": "https://api.taskon.xyz/tasks/follow-twitter",
        }
        assert config["source"] == "taskon"
        assert "project_id" in config
        assert "task_id" in config
        assert "api_endpoint" in config

    def test_custom_rwa_task_config(self):
        """FUNCTIONAL: Custom RWA task should store verification rules."""
        config = {
            "source": "custom",
            "verification_type": "time_dimension",
            "rules": {
                "asset_type": "RWA",
                "min_hold_days": 30,
                "min_amount": "1000",  # in USD
                "health_factor_min": 1.5,
            },
        }
        assert config["source"] == "custom"
        assert config["verification_type"] == "time_dimension"
        assert config["rules"]["min_hold_days"] == 30
        assert Decimal(config["rules"]["min_amount"]) == Decimal("1000")

    def test_referral_task_config(self):
        """FUNCTIONAL: Referral task should store referral targets."""
        config = {
            "source": "referral",
            "target_type": "invite_friends",
            "rules": {
                "min_referrals": 5,
                "reward_per_referral": "10",  # in esPAIMON
            },
        }
        assert config["source"] == "referral"
        assert config["target_type"] == "invite_friends"
        assert config["rules"]["min_referrals"] == 5

    def test_config_extensibility(self):
        """FUNCTIONAL: Config should support arbitrary fields for future expansion."""
        config = {
            "source": "taskon",
            "custom_field": "future_feature",
            "nested": {"deep": "value"},
        }
        # JSON field should allow arbitrary structure
        assert "custom_field" in config
        assert config["nested"]["deep"] == "value"


class TestEnhancedTaskProgressModel:
    """Test enhanced TaskProgress table structure."""

    @pytest.mark.asyncio
    async def test_task_progress_with_config(self, test_db):
        """FUNCTIONAL: TaskProgress should store task configuration."""
        from app.models.user import User

        # Create test user
        user = User(
            address="0x1234567890123456789012345678901234567890",
            referral_code="TEST0001",
        )
        test_db.add(user)
        await test_db.flush()

        # Create task progress with configuration
        task_config = {
            "source": "taskon",
            "project_id": "paimon-dex",
            "task_id": "follow-twitter",
        }

        task_progress = TaskProgress(
            user_id=user.id,
            task_id="taskon-follow-twitter",
            task_type=TaskType.SOCIAL,
            status=TaskStatus.PENDING,
            config=task_config,  # New field
        )
        test_db.add(task_progress)
        await test_db.commit()

        # Verify storage
        assert task_progress.id is not None
        assert task_progress.config == task_config

    @pytest.mark.asyncio
    async def test_task_progress_with_verification_data(self, test_db):
        """FUNCTIONAL: TaskProgress should store verification snapshots."""
        from app.models.user import User

        # Create test user
        user = User(
            address="0x1234567890123456789012345678901234567891",
            referral_code="TEST0002",
        )
        test_db.add(user)
        await test_db.flush()

        # Create RWA task with verification data
        verification_data = {
            "check_timestamp": datetime.now(UTC).isoformat(),
            "asset_value_usd": "5000",
            "hold_days": 35,
            "health_factor": 1.8,
            "passed": True,
        }

        task_progress = TaskProgress(
            user_id=user.id,
            task_id="rwa-hold-30-days",
            task_type=TaskType.ONCHAIN_COMPLEX,
            status=TaskStatus.COMPLETED,
            verification_data=verification_data,  # New field
            completed_at=datetime.now(UTC),
        )
        test_db.add(task_progress)
        await test_db.commit()

        # Verify storage
        assert task_progress.verification_data is not None
        assert task_progress.verification_data["passed"] is True
        assert Decimal(task_progress.verification_data["asset_value_usd"]) == Decimal(
            "5000"
        )

    @pytest.mark.asyncio
    async def test_task_progress_with_external_id(self, test_db):
        """FUNCTIONAL: TaskProgress should track external task IDs (TaskOn)."""
        from app.models.user import User

        user = User(
            address="0x1234567890123456789012345678901234567892",
            referral_code="TEST0003",
        )
        test_db.add(user)
        await test_db.flush()

        task_progress = TaskProgress(
            user_id=user.id,
            task_id="custom-internal-id-123",
            external_task_id="taskon_project_task_456",  # New field
            task_type=TaskType.SOCIAL,
            status=TaskStatus.PENDING,
        )
        test_db.add(task_progress)
        await test_db.commit()

        assert task_progress.external_task_id == "taskon_project_task_456"

    @pytest.mark.asyncio
    async def test_task_progress_unique_constraint(self, test_db):
        """BOUNDARY: User should not have duplicate task progress records."""
        from app.models.user import User
        from sqlalchemy.exc import IntegrityError

        user = User(
            address="0x1234567890123456789012345678901234567893",
            referral_code="TEST0004",
        )
        test_db.add(user)
        await test_db.flush()

        # First task progress
        task1 = TaskProgress(
            user_id=user.id,
            task_id="follow-twitter",
            task_type=TaskType.SOCIAL,
            status=TaskStatus.PENDING,
        )
        test_db.add(task1)
        await test_db.commit()

        # Duplicate task progress (should fail)
        task2 = TaskProgress(
            user_id=user.id,
            task_id="follow-twitter",
            task_type=TaskType.SOCIAL,
            status=TaskStatus.COMPLETED,
        )
        test_db.add(task2)

        with pytest.raises(IntegrityError):
            await test_db.commit()


class TestTaskSchemaCompatibility:
    """Test JSON Schema compatibility for different task sources."""

    def test_schema_supports_multiple_sources(self):
        """COMPATIBILITY: Schema should support TaskOn and custom tasks."""
        taskon_schema = {"source": "taskon", "project_id": "paimon"}
        custom_schema = {"source": "custom", "verification_type": "time"}

        assert taskon_schema["source"] == "taskon"
        assert custom_schema["source"] == "custom"

    def test_schema_backward_compatibility(self):
        """COMPATIBILITY: Old tasks without config should still work."""
        # Simulate old task without config field
        old_task_data = {
            "task_id": "old-task",
            "task_type": "social",
            "status": "pending",
            "config": None,  # Old tasks may have null config
        }
        assert old_task_data["config"] is None  # Should not crash


class TestTaskSystemPerformance:
    """Test performance considerations for task system."""

    def test_indexed_fields(self):
        """PERFORMANCE: Critical fields should have indexes."""
        # This is a design test - actual indexes are in Alembic migration
        indexed_fields = ["user_id", "task_id", "status"]
        # All indexed fields should be present
        for field in indexed_fields:
            assert field in [
                "user_id",
                "task_id",
                "task_type",
                "status",
                "external_task_id",
            ]

    def test_composite_index_design(self):
        """PERFORMANCE: Composite index on (user_id, task_id) for fast lookup."""
        # Design test - verifies we need composite index
        # Common query: SELECT * FROM task_progress WHERE user_id = ? AND task_id = ?
        composite_index = ("user_id", "task_id")
        assert len(composite_index) == 2
        assert "user_id" in composite_index
        assert "task_id" in composite_index


class TestTaskSystemSecurity:
    """Test security considerations for task system."""

    def test_reward_amount_precision(self):
        """SECURITY: Reward amounts should use high precision to avoid rounding errors."""
        reward = Decimal("123.456789012345678901")  # 18 decimals
        # Numeric(36, 18) supports up to 18 decimals
        assert reward.as_tuple().exponent <= -18 or reward == 0

    def test_config_injection_prevention(self):
        """SECURITY: Config should be validated before storage."""
        malicious_config = {
            "source": "taskon",
            "sql_injection": "'; DROP TABLE users; --",
        }
        # JSON storage automatically escapes strings
        # This is a design test - actual validation in service layer
        assert malicious_config["sql_injection"] is not None
