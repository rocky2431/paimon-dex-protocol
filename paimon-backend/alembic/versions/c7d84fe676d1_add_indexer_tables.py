"""add_indexer_tables

Revision ID: c7d84fe676d1
Revises: ba131919a137
Create Date: 2025-11-15 18:03:52.690685

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c7d84fe676d1'
down_revision: Union[str, Sequence[str], None] = 'ba131919a137'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create lp_positions table
    op.create_table(
        'lp_positions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_address', sa.String(length=42), nullable=False),
        sa.Column('pair_address', sa.String(length=42), nullable=False),
        sa.Column('pool_name', sa.String(length=50), nullable=False),
        sa.Column('lp_token_balance', sa.Numeric(precision=78, scale=18), nullable=False),
        sa.Column('share_percentage', sa.Numeric(precision=10, scale=6), nullable=False),
        sa.Column('liquidity_usd', sa.Numeric(precision=20, scale=2), nullable=False),
        sa.Column('token0_amount', sa.Numeric(precision=78, scale=18), nullable=False),
        sa.Column('token1_amount', sa.Numeric(precision=78, scale=18), nullable=False),
        sa.Column('token0_symbol', sa.String(length=20), nullable=False),
        sa.Column('token1_symbol', sa.String(length=20), nullable=False),
        sa.Column('current_apr', sa.Numeric(precision=10, scale=4), nullable=False, server_default='0'),
        sa.Column('pending_rewards', sa.Numeric(precision=78, scale=18), nullable=False, server_default='0'),
        sa.Column('last_updated', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_address', 'pair_address', name='uq_lp_user_pair')
    )
    op.create_index(op.f('idx_lp_user'), 'lp_positions', ['user_address'], unique=False)
    op.create_index(op.f('idx_lp_pair'), 'lp_positions', ['pair_address'], unique=False)

    # Create vault_positions table
    op.create_table(
        'vault_positions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_address', sa.String(length=42), nullable=False),
        sa.Column('collateral_address', sa.String(length=42), nullable=False),
        sa.Column('asset_name', sa.String(length=20), nullable=False),
        sa.Column('collateral_amount', sa.Numeric(precision=78, scale=18), nullable=False),
        sa.Column('collateral_value_usd', sa.Numeric(precision=20, scale=2), nullable=False),
        sa.Column('debt_amount', sa.Numeric(precision=78, scale=18), nullable=False, server_default='0'),
        sa.Column('ltv_ratio', sa.Numeric(precision=10, scale=4), nullable=False),
        sa.Column('health_factor', sa.Numeric(precision=20, scale=6), nullable=False),
        sa.Column('liquidation_price', sa.Numeric(precision=20, scale=8), nullable=False),
        sa.Column('last_updated', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_address', 'collateral_address', name='uq_vault_user_collateral')
    )
    op.create_index(op.f('idx_vault_user'), 'vault_positions', ['user_address'], unique=False)
    op.create_index(op.f('idx_vault_health'), 'vault_positions', ['health_factor'], unique=False)

    # Create venft_positions table
    op.create_table(
        'venft_positions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_address', sa.String(length=42), nullable=False),
        sa.Column('token_id', sa.BigInteger(), nullable=False),
        sa.Column('locked_amount', sa.Numeric(precision=78, scale=18), nullable=False),
        sa.Column('lock_end', sa.BigInteger(), nullable=False),
        sa.Column('voting_power', sa.Numeric(precision=78, scale=18), nullable=False),
        sa.Column('remaining_days', sa.Integer(), nullable=False),
        sa.Column('is_expired', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('last_updated', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('idx_venft_user'), 'venft_positions', ['user_address'], unique=False)
    op.create_index(op.f('idx_venft_expiry'), 'venft_positions', ['lock_end'], unique=False)
    op.create_index(op.f('idx_venft_token_id'), 'venft_positions', ['token_id'], unique=True)

    # Create portfolio_summary table
    op.create_table(
        'portfolio_summary',
        sa.Column('user_address', sa.String(length=42), nullable=False),
        sa.Column('total_net_worth', sa.Numeric(precision=20, scale=2), nullable=False),
        sa.Column('total_lp_value', sa.Numeric(precision=20, scale=2), nullable=False, server_default='0'),
        sa.Column('total_collateral_value', sa.Numeric(precision=20, scale=2), nullable=False, server_default='0'),
        sa.Column('total_debt', sa.Numeric(precision=20, scale=2), nullable=False, server_default='0'),
        sa.Column('total_locked_paimon', sa.Numeric(precision=20, scale=2), nullable=False, server_default='0'),
        sa.Column('total_pending_rewards', sa.Numeric(precision=20, scale=2), nullable=False, server_default='0'),
        sa.Column('risk_alerts', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('cache_version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('last_updated', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('user_address')
    )
    op.create_index(op.f('idx_portfolio_summary_updated'), 'portfolio_summary', ['last_updated'], unique=False)

    # Create indexer_state table
    op.create_table(
        'indexer_state',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('contract_name', sa.String(length=50), nullable=False),
        sa.Column('last_scanned_block', sa.BigInteger(), nullable=False, server_default='0'),
        sa.Column('last_scanned_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('is_syncing', sa.Boolean(), nullable=False, server_default='false'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('contract_name')
    )

    # Initialize indexer state for contracts
    op.execute(
        """
        INSERT INTO indexer_state (contract_name, last_scanned_block) VALUES
            ('DEXFactory', 0),
            ('USDPVault', 0),
            ('VotingEscrowPaimon', 0),
            ('SavingRate', 0),
            ('StabilityPool', 0),
            ('GaugeController', 0)
        """
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('indexer_state')
    op.drop_index(op.f('idx_portfolio_summary_updated'), table_name='portfolio_summary')
    op.drop_table('portfolio_summary')
    op.drop_index(op.f('idx_venft_token_id'), table_name='venft_positions')
    op.drop_index(op.f('idx_venft_expiry'), table_name='venft_positions')
    op.drop_index(op.f('idx_venft_user'), table_name='venft_positions')
    op.drop_table('venft_positions')
    op.drop_index(op.f('idx_vault_health'), table_name='vault_positions')
    op.drop_index(op.f('idx_vault_user'), table_name='vault_positions')
    op.drop_table('vault_positions')
    op.drop_index(op.f('idx_lp_pair'), table_name='lp_positions')
    op.drop_index(op.f('idx_lp_user'), table_name='lp_positions')
    op.drop_table('lp_positions')
