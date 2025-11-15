"""create_timescaledb_tables

Revision ID: 61ecaf017959
Revises: c7d84fe676d1
Create Date: 2025-11-15 18:33:39.883695

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '61ecaf017959'
down_revision: Union[str, Sequence[str], None] = 'c7d84fe676d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Create historical APR and rewards tables.

    PostgreSQL: Creates TimescaleDB hypertables with 90-day retention policy
    SQLite: Creates regular tables with timestamp indexes
    """
    bind = op.get_bind()
    is_postgresql = bind.dialect.name == "postgresql"

    # Create historical_apr table
    op.create_table(
        "historical_apr",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("pool_address", sa.String(length=42), nullable=False),
        sa.Column("pool_name", sa.String(length=50), nullable=False),
        sa.Column(
            "timestamp",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column("apr", sa.Numeric(precision=10, scale=4), nullable=False),
        sa.Column("tvl_usd", sa.Numeric(precision=20, scale=2), nullable=False),
        sa.Column(
            "trading_volume_24h",
            sa.Numeric(precision=20, scale=2),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_historical_apr")),
        sa.UniqueConstraint(
            "pool_address", "timestamp", name="uq_apr_pool_time"
        ),
    )

    # Create indexes for historical_apr
    op.create_index(
        "idx_historical_apr_pool_address",
        "historical_apr",
        ["pool_address"],
        unique=False,
    )
    op.create_index(
        "idx_historical_apr_timestamp",
        "historical_apr",
        ["timestamp"],
        unique=False,
    )
    op.create_index(
        "idx_apr_time_pool",
        "historical_apr",
        ["timestamp", "pool_address"],
        unique=False,
    )

    # Create historical_rewards table
    op.create_table(
        "historical_rewards",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_address", sa.String(length=42), nullable=False),
        sa.Column("pool_address", sa.String(length=42), nullable=False),
        sa.Column(
            "timestamp",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column("reward_type", sa.String(length=20), nullable=False),
        sa.Column("amount", sa.Numeric(precision=78, scale=18), nullable=False),
        sa.Column(
            "cumulative_amount",
            sa.Numeric(precision=78, scale=18),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_historical_rewards")),
        sa.UniqueConstraint(
            "user_address",
            "timestamp",
            "pool_address",
            "reward_type",
            name="uq_rewards_user_time_pool_type",
        ),
    )

    # Create indexes for historical_rewards
    op.create_index(
        "idx_historical_rewards_user_address",
        "historical_rewards",
        ["user_address"],
        unique=False,
    )
    op.create_index(
        "idx_historical_rewards_pool_address",
        "historical_rewards",
        ["pool_address"],
        unique=False,
    )
    op.create_index(
        "idx_historical_rewards_timestamp",
        "historical_rewards",
        ["timestamp"],
        unique=False,
    )
    op.create_index(
        "idx_rewards_time_user",
        "historical_rewards",
        ["timestamp", "user_address"],
        unique=False,
    )
    op.create_index(
        "idx_rewards_pool_time",
        "historical_rewards",
        ["pool_address", "timestamp"],
        unique=False,
    )

    # PostgreSQL: Configure TimescaleDB hypertables
    if is_postgresql:
        # Install TimescaleDB extension (idempotent)
        op.execute("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;")

        # Convert tables to hypertables (partitioned by timestamp)
        op.execute(
            """
            SELECT create_hypertable(
                'historical_apr',
                'timestamp',
                if_not_exists => TRUE,
                migrate_data => TRUE
            );
            """
        )

        op.execute(
            """
            SELECT create_hypertable(
                'historical_rewards',
                'timestamp',
                if_not_exists => TRUE,
                migrate_data => TRUE
            );
            """
        )

        # Add 90-day data retention policy
        op.execute(
            """
            SELECT add_retention_policy(
                'historical_apr',
                INTERVAL '90 days',
                if_not_exists => TRUE
            );
            """
        )

        op.execute(
            """
            SELECT add_retention_policy(
                'historical_rewards',
                INTERVAL '90 days',
                if_not_exists => TRUE
            );
            """
        )

        print("✅ TimescaleDB hypertables created with 90-day retention policy")
    else:
        print("ℹ️ SQLite detected - using regular tables with timestamp indexes")


def downgrade() -> None:
    """Drop historical tables."""
    bind = op.get_bind()
    is_postgresql = bind.dialect.name == "postgresql"

    # PostgreSQL: Remove retention policies before dropping tables
    if is_postgresql:
        # Remove retention policies (if exist)
        op.execute(
            """
            SELECT remove_retention_policy('historical_apr', if_exists => TRUE);
            """
        )
        op.execute(
            """
            SELECT remove_retention_policy('historical_rewards', if_exists => TRUE);
            """
        )

    # Drop indexes and tables
    op.drop_index("idx_rewards_pool_time", table_name="historical_rewards")
    op.drop_index("idx_rewards_time_user", table_name="historical_rewards")
    op.drop_index(
        "idx_historical_rewards_timestamp", table_name="historical_rewards"
    )
    op.drop_index(
        "idx_historical_rewards_pool_address", table_name="historical_rewards"
    )
    op.drop_index(
        "idx_historical_rewards_user_address", table_name="historical_rewards"
    )
    op.drop_table("historical_rewards")

    op.drop_index("idx_apr_time_pool", table_name="historical_apr")
    op.drop_index("idx_historical_apr_timestamp", table_name="historical_apr")
    op.drop_index("idx_historical_apr_pool_address", table_name="historical_apr")
    op.drop_table("historical_apr")
