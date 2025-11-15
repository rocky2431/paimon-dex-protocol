"""
Referral system service.

Handles referral code generation, relationship tracking, and statistics.
"""

import logging
import random
import string
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.referral import Referral
from app.models.user import User

logger = logging.getLogger(__name__)


class ReferralService:
    """Service for managing referral codes and relationships."""

    def __init__(self, db: AsyncSession):
        """Initialize referral service with database session."""
        self.db = db

    async def generate_unique_code(self, length: int = 8, max_attempts: int = 10) -> str:
        """
        Generate a unique referral code.

        Args:
            length: Length of the code (6-8 characters)
            max_attempts: Maximum attempts to generate unique code

        Returns:
            Unique referral code

        Raises:
            ValueError: If cannot generate unique code after max_attempts
        """
        if length < 6 or length > 8:
            raise ValueError("Referral code length must be between 6 and 8 characters")

        for attempt in range(max_attempts):
            # Generate random code using uppercase letters and digits
            code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

            # Check if code already exists
            existing = await self.db.execute(
                select(User).where(User.referral_code == code)
            )
            if not existing.scalar_one_or_none():
                return code

        raise ValueError(
            f"Failed to generate unique referral code after {max_attempts} attempts"
        )

    async def update_user_referral_code(self, user_id: int) -> str:
        """
        Generate and update user's referral code.

        Args:
            user_id: User ID

        Returns:
            Generated referral code

        Raises:
            ValueError: If user not found or code generation fails
        """
        # Get user
        user_result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        user = user_result.scalar_one_or_none()
        if not user:
            raise ValueError(f"User {user_id} not found")

        # Generate new code
        new_code = await self.generate_unique_code()

        # Update user
        user.referral_code = new_code
        await self.db.commit()
        await self.db.refresh(user)

        logger.info(f"Updated referral code for user {user_id}: {new_code}")
        return new_code

    async def get_referral_stats(self, user_id: int) -> dict:
        """
        Get referral statistics for a user.

        Args:
            user_id: User ID

        Returns:
            Dictionary with referral statistics

        Raises:
            ValueError: If user not found
        """
        # Verify user exists
        user_result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        user = user_result.scalar_one_or_none()
        if not user:
            raise ValueError(f"User {user_id} not found")

        # Count total referrals
        total_count_result = await self.db.execute(
            select(func.count(Referral.id)).where(Referral.referrer_id == user_id)
        )
        total_count = total_count_result.scalar() or 0

        # Sum total rewards earned
        total_rewards_result = await self.db.execute(
            select(func.sum(Referral.reward_earned)).where(Referral.referrer_id == user_id)
        )
        total_rewards = total_rewards_result.scalar() or 0

        # Get referral code
        referral_code = user.referral_code

        return {
            "user_id": user_id,
            "referral_code": referral_code,
            "total_referrals": int(total_count),
            "total_rewards_earned": str(total_rewards),
        }

    async def create_referral_relationship(
        self, referee_id: int, referral_code: str
    ) -> Referral:
        """
        Create a referral relationship between referee and referrer.

        Args:
            referee_id: ID of the user being referred
            referral_code: Referral code of the referrer

        Returns:
            Created Referral object

        Raises:
            ValueError: If validation fails (self-referral, circular, invalid code, already referred)
        """
        # Get referee
        referee_result = await self.db.execute(
            select(User).where(User.id == referee_id)
        )
        referee = referee_result.scalar_one_or_none()
        if not referee:
            raise ValueError(f"Referee user {referee_id} not found")

        # Check if user already has a referrer
        if referee.referred_by is not None:
            raise ValueError(
                f"User {referee_id} has already been referred by user {referee.referred_by}"
            )

        # Get referrer by code
        referrer_result = await self.db.execute(
            select(User).where(User.referral_code == referral_code)
        )
        referrer = referrer_result.scalar_one_or_none()
        if not referrer:
            raise ValueError(f"Invalid referral code: {referral_code}")

        # Prevent self-referral
        if referee.id == referrer.id:
            raise ValueError("Cannot refer yourself")

        # Prevent circular referrals (check if referrer was referred by referee)
        if referrer.referred_by == referee.id:
            raise ValueError(
                f"Circular referral detected: User {referrer.id} was referred by user {referee.id}"
            )

        # Create referral record
        referral = Referral(
            referrer_id=referrer.id,
            referee_id=referee.id,
            reward_earned=0,  # Initial reward is 0
        )

        # Update referee's referred_by field
        referee.referred_by = referrer.id

        # Save to database
        self.db.add(referral)
        await self.db.commit()
        await self.db.refresh(referral)

        logger.info(
            f"Created referral relationship: user {referee.id} referred by user {referrer.id}"
        )
        return referral
