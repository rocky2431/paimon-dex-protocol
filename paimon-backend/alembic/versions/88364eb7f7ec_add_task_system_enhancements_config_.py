"""Add task system enhancements: config, verification_data, external_task_id fields and unique constraint

Revision ID: 88364eb7f7ec
Revises: 8c4ecbce1f76
Create Date: 2025-11-15 13:32:09.424853

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '88364eb7f7ec'
down_revision: Union[str, Sequence[str], None] = '8c4ecbce1f76'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema using batch mode for SQLite compatibility."""
    # Use batch_alter_table for SQLite compatibility
    with op.batch_alter_table('task_progress', schema=None) as batch_op:
        batch_op.add_column(sa.Column('external_task_id', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('config', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('verification_data', sa.JSON(), nullable=True))
        batch_op.create_index(batch_op.f('ix_task_progress_external_task_id'), ['external_task_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_task_progress_status'), ['status'], unique=False)
        batch_op.create_unique_constraint('uq_user_task', ['user_id', 'task_id'])


def downgrade() -> None:
    """Downgrade schema using batch mode for SQLite compatibility."""
    # Use batch_alter_table for SQLite compatibility
    with op.batch_alter_table('task_progress', schema=None) as batch_op:
        batch_op.drop_constraint('uq_user_task', type_='unique')
        batch_op.drop_index(batch_op.f('ix_task_progress_status'))
        batch_op.drop_index(batch_op.f('ix_task_progress_external_task_id'))
        batch_op.drop_column('verification_data')
        batch_op.drop_column('config')
        batch_op.drop_column('external_task_id')
