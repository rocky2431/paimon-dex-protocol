"""add_performance_indexes

Revision ID: e7d4d1011c63
Revises: 61ecaf017959
Create Date: 2025-11-15 19:06:37.323365

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e7d4d1011c63'
down_revision: Union[str, Sequence[str], None] = '61ecaf017959'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add composite indexes for query performance optimization."""

    # Historical APR indexes
    # Query pattern: SELECT * FROM historical_apr WHERE pool_address = ? AND timestamp >= ? ORDER BY timestamp DESC
    op.create_index(
        'idx_historical_apr_pool_time',
        'historical_apr',
        ['pool_address', sa.text('timestamp DESC')],
        unique=False
    )

    # Historical Rewards indexes
    # Query pattern 1: SELECT * FROM historical_rewards WHERE user_address = ? AND timestamp >= ? ORDER BY timestamp DESC
    op.create_index(
        'idx_historical_rewards_user_time',
        'historical_rewards',
        ['user_address', sa.text('timestamp DESC')],
        unique=False
    )

    # Query pattern 2: SELECT * FROM historical_rewards WHERE user_address = ? AND pool_address = ? AND timestamp >= ?
    op.create_index(
        'idx_historical_rewards_user_pool_time',
        'historical_rewards',
        ['user_address', 'pool_address', sa.text('timestamp DESC')],
        unique=False
    )

    # Query pattern 3: SELECT * FROM historical_rewards WHERE user_address = ? AND reward_type = ? AND timestamp >= ?
    op.create_index(
        'idx_historical_rewards_user_type_time',
        'historical_rewards',
        ['user_address', 'reward_type', sa.text('timestamp DESC')],
        unique=False
    )

    # Task Progress indexes
    # Query pattern 1: SELECT * FROM task_progress WHERE user_id = ? AND task_id = ?
    op.create_index(
        'idx_task_progress_user_task',
        'task_progress',
        ['user_id', 'task_id'],
        unique=False
    )

    # Query pattern 2: SELECT * FROM task_progress WHERE user_id = ? AND status = ?
    op.create_index(
        'idx_task_progress_user_status',
        'task_progress',
        ['user_id', 'status'],
        unique=False
    )


def downgrade() -> None:
    """Remove composite indexes."""

    # Drop Task Progress indexes
    op.drop_index('idx_task_progress_user_status', table_name='task_progress')
    op.drop_index('idx_task_progress_user_task', table_name='task_progress')

    # Drop Historical Rewards indexes
    op.drop_index('idx_historical_rewards_user_type_time', table_name='historical_rewards')
    op.drop_index('idx_historical_rewards_user_pool_time', table_name='historical_rewards')
    op.drop_index('idx_historical_rewards_user_time', table_name='historical_rewards')

    # Drop Historical APR indexes
    op.drop_index('idx_historical_apr_pool_time', table_name='historical_apr')
