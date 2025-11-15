"""
Points system service.

Handles all points-related operations with idempotency guarantees.
"""

import json
import logging
from typing import Optional

from sqlalchemy import desc, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.points import PointsBalance, PointsTransaction
from app.models.user import User

logger = logging.getLogger(__name__)


class PointsService:
    """Service for managing user points."""

    def __init__(self, db: AsyncSession):
        """Initialize points service with database session."""
        self.db = db

    async def get_or_create_balance(self, user_id: int) -> PointsBalance:
        """
        Get user's points balance, create if not exists.

        Args:
            user_id: User ID

        Returns:
            PointsBalance object

        Raises:
            ValueError: If user doesn't exist
        """
        # Check if user exists
        user_result = await self.db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if not user:
            raise ValueError(f"User {user_id} not found")

        # Get or create balance
        result = await self.db.execute(
            select(PointsBalance).where(PointsBalance.user_id == user_id)
        )
        balance = result.scalar_one_or_none()

        if not balance:
            balance = PointsBalance(user_id=user_id, balance=0)
            self.db.add(balance)
            await self.db.commit()
            await self.db.refresh(balance)

        return balance

    async def award_points(
        self,
        user_id: int,
        amount: int,
        source: str,
        reference_id: str,
        metadata: Optional[dict] = None,
    ) -> PointsTransaction:
        """
        Award points to a user (idempotent).

        Args:
            user_id: User ID
            amount: Points to award (must be positive)
            source: Source of points (e.g., 'task_completion')
            reference_id: Reference ID (e.g., task_id)
            metadata: Optional additional data

        Returns:
            PointsTransaction object

        Raises:
            ValueError: If amount is negative or user not found
            IntegrityError: If transaction_id already exists (idempotency)
        """
        if amount <= 0:
            raise ValueError("Award amount must be positive")

        # Generate idempotency key
        transaction_id = f"{source}:{reference_id}"

        # Check if transaction already exists (idempotency)
        existing = await self.db.execute(
            select(PointsTransaction).where(
                PointsTransaction.transaction_id == transaction_id
            )
        )
        if existing_tx := existing.scalar_one_or_none():
            logger.info(f"Transaction {transaction_id} already exists, returning existing")
            return existing_tx

        # Get or create balance
        balance = await self.get_or_create_balance(user_id)

        # Create transaction
        new_balance = balance.balance + amount
        transaction = PointsTransaction(
            balance_id=balance.id,
            type="award",
            amount=amount,
            balance_after=new_balance,
            source=source,
            reference_id=reference_id,
            transaction_id=transaction_id,
            transaction_metadata=json.dumps(metadata) if metadata else None,
        )

        try:
            # Update balance
            balance.balance = new_balance
            balance.total_earned += amount

            # Save transaction
            self.db.add(transaction)
            await self.db.commit()
            await self.db.refresh(transaction)

            logger.info(
                f"Awarded {amount} points to user {user_id} (source: {source}, ref: {reference_id})"
            )
            return transaction

        except IntegrityError as e:
            await self.db.rollback()
            logger.error(f"Failed to award points: {e}")
            # Try to get existing transaction again (race condition)
            existing = await self.db.execute(
                select(PointsTransaction).where(
                    PointsTransaction.transaction_id == transaction_id
                )
            )
            if existing_tx := existing.scalar_one_or_none():
                return existing_tx
            raise

    async def deduct_points(
        self,
        user_id: int,
        amount: int,
        source: str,
        reference_id: str,
        metadata: Optional[dict] = None,
    ) -> PointsTransaction:
        """
        Deduct points from a user (idempotent).

        Args:
            user_id: User ID
            amount: Points to deduct (must be positive)
            source: Source of deduction
            reference_id: Reference ID
            metadata: Optional additional data

        Returns:
            PointsTransaction object

        Raises:
            ValueError: If amount is negative, user not found, or insufficient balance
        """
        if amount <= 0:
            raise ValueError("Deduction amount must be positive")

        # Generate idempotency key
        transaction_id = f"{source}:{reference_id}"

        # Check if transaction already exists (idempotency)
        existing = await self.db.execute(
            select(PointsTransaction).where(
                PointsTransaction.transaction_id == transaction_id
            )
        )
        if existing_tx := existing.scalar_one_or_none():
            logger.info(f"Transaction {transaction_id} already exists, returning existing")
            return existing_tx

        # Get balance
        balance = await self.get_or_create_balance(user_id)

        # Check sufficient balance
        if balance.balance < amount:
            raise ValueError(
                f"Insufficient balance: {balance.balance} < {amount}"
            )

        # Create transaction
        new_balance = balance.balance - amount
        transaction = PointsTransaction(
            balance_id=balance.id,
            type="deduct",
            amount=-amount,  # Negative for deductions
            balance_after=new_balance,
            source=source,
            reference_id=reference_id,
            transaction_id=transaction_id,
            transaction_metadata=json.dumps(metadata) if metadata else None,
        )

        try:
            # Update balance
            balance.balance = new_balance
            balance.total_spent += amount

            # Save transaction
            self.db.add(transaction)
            await self.db.commit()
            await self.db.refresh(transaction)

            logger.info(
                f"Deducted {amount} points from user {user_id} (source: {source}, ref: {reference_id})"
            )
            return transaction

        except IntegrityError as e:
            await self.db.rollback()
            logger.error(f"Failed to deduct points: {e}")
            raise

    async def get_balance(self, user_id: int) -> PointsBalance:
        """
        Get user's current points balance.

        Args:
            user_id: User ID

        Returns:
            PointsBalance object

        Raises:
            ValueError: If user not found
        """
        return await self.get_or_create_balance(user_id)

    async def get_transactions(
        self,
        user_id: int,
        limit: int = 50,
        offset: int = 0,
        transaction_type: Optional[str] = None,
    ) -> tuple[list[PointsTransaction], int]:
        """
        Get user's transaction history with pagination.

        Args:
            user_id: User ID
            limit: Number of transactions to return
            offset: Offset for pagination
            transaction_type: Filter by type ('award', 'deduct', 'redeem')

        Returns:
            Tuple of (transactions list, total count)

        Raises:
            ValueError: If user not found
        """
        # Get balance (validates user exists)
        balance = await self.get_or_create_balance(user_id)

        # Build query
        query = select(PointsTransaction).where(
            PointsTransaction.balance_id == balance.id
        )

        if transaction_type:
            query = query.where(PointsTransaction.type == transaction_type)

        # Get total count
        count_result = await self.db.execute(
            select(PointsTransaction.id).where(
                PointsTransaction.balance_id == balance.id
            )
        )
        total_count = len(count_result.all())

        # Get paginated results
        query = query.order_by(desc(PointsTransaction.created_at)).limit(limit).offset(offset)
        result = await self.db.execute(query)
        transactions = result.scalars().all()

        return list(transactions), total_count
