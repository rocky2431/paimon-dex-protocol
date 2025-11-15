"""add_points_redemptions_table

Revision ID: ba131919a137
Revises: 3209aa090f79
Create Date: 2025-11-15 17:47:30.091403

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ba131919a137'
down_revision: Union[str, Sequence[str], None] = '3209aa090f79'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'points_redemptions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('points_amount', sa.BigInteger(), nullable=False),
        sa.Column('espaimon_amount', sa.Numeric(precision=36, scale=18), nullable=False),
        sa.Column('status', sa.Enum('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', name='redemptionstatus'), nullable=False),
        sa.Column('transaction_hash', sa.String(length=66), nullable=True),
        sa.Column('block_number', sa.BigInteger(), nullable=True),
        sa.Column('error_message', sa.String(length=500), nullable=True),
        sa.Column('retry_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('processed_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_points_redemptions_user_id'), 'points_redemptions', ['user_id'], unique=False)
    op.create_index(op.f('ix_points_redemptions_status'), 'points_redemptions', ['status'], unique=False)
    op.create_index(op.f('ix_points_redemptions_transaction_hash'), 'points_redemptions', ['transaction_hash'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_points_redemptions_transaction_hash'), table_name='points_redemptions')
    op.drop_index(op.f('ix_points_redemptions_status'), table_name='points_redemptions')
    op.drop_index(op.f('ix_points_redemptions_user_id'), table_name='points_redemptions')
    op.drop_table('points_redemptions')
    op.execute('DROP TYPE IF EXISTS redemptionstatus')
