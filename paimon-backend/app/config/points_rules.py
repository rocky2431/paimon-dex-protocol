"""
Points System Rules Configuration.

Defines all point earning and redemption rules.
"""

from enum import Enum
from typing import Dict


class PointsAction(str, Enum):
    """Point earning actions."""
    TASK_COMPLETION = "task_completion"
    DAILY_LOGIN = "daily_login"
    REFERRAL_SIGNUP = "referral_signup"
    TRADE_VOLUME = "trade_volume"
    LIQUIDITY_PROVISION = "liquidity_provision"
    KYC_COMPLETION = "kyc_completion"


class RedemptionItem(str, Enum):
    """Redemption items."""
    FEE_DISCOUNT_5 = "fee_discount_5"  # 5% fee discount
    FEE_DISCOUNT_10 = "fee_discount_10"  # 10% fee discount
    PRIORITY_SUPPORT = "priority_support"
    EXCLUSIVE_NFT = "exclusive_nft"


# Points earning rules
POINTS_RULES: Dict[PointsAction, int] = {
    PointsAction.TASK_COMPLETION: 100,  # Base points for task
    PointsAction.DAILY_LOGIN: 10,
    PointsAction.REFERRAL_SIGNUP: 500,  # When referral completes KYC
    PointsAction.TRADE_VOLUME: 1,  # 1 point per $1 trading volume
    PointsAction.LIQUIDITY_PROVISION: 2,  # 2 points per $1 TVL per day
    PointsAction.KYC_COMPLETION: 1000,
}

# Redemption costs (in points)
REDEMPTION_COSTS: Dict[RedemptionItem, int] = {
    RedemptionItem.FEE_DISCOUNT_5: 5000,  # 5% fee discount for 30 days
    RedemptionItem.FEE_DISCOUNT_10: 15000,  # 10% fee discount for 30 days
    RedemptionItem.PRIORITY_SUPPORT: 10000,  # Priority support for 90 days
    RedemptionItem.EXCLUSIVE_NFT: 50000,  # Exclusive NFT badge
}

# Leaderboard settings
LEADERBOARD_TOP_N = 100  # Top 100 users
LEADERBOARD_UPDATE_INTERVAL = 3600  # Update every hour (seconds)
