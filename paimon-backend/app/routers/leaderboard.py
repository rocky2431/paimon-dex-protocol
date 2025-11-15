"""Points Leaderboard API."""

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.database import get_db
from app.models.user import User
from app.models.points import PointsBalance
from app.config.points_rules import LEADERBOARD_TOP_N

router = APIRouter(prefix="/api/leaderboard", tags=["Leaderboard"])


class LeaderboardEntry(BaseModel):
    """Leaderboard entry."""
    rank: int
    user_address: str
    total_points: int
    username: str | None = None


class LeaderboardResponse(BaseModel):
    """Leaderboard response."""
    leaderboard: list[LeaderboardEntry]
    total_users: int
    updated_at: str


@router.get("", response_model=LeaderboardResponse)
async def get_leaderboard(
    limit: int = LEADERBOARD_TOP_N,
    db: AsyncSession = Depends(get_db),
) -> LeaderboardResponse:
    """Get points leaderboard."""
    from datetime import datetime, UTC

    # Query top users by points
    stmt = (
        select(
            PointsBalance.user_id,
            PointsBalance.total_earned,
            User.wallet_address,
        )
        .join(User, PointsBalance.user_id == User.id)
        .order_by(PointsBalance.total_earned.desc())
        .limit(limit)
    )

    result = await db.execute(stmt)
    rows = result.all()

    leaderboard = [
        LeaderboardEntry(
            rank=idx + 1,
            user_address=row.wallet_address,
            total_points=row.total_earned,
        )
        for idx, row in enumerate(rows)
    ]

    # Count total users
    count_stmt = select(func.count(PointsBalance.user_id))
    total_users = (await db.execute(count_stmt)).scalar() or 0

    return LeaderboardResponse(
        leaderboard=leaderboard,
        total_users=total_users,
        updated_at=datetime.now(UTC).isoformat(),
    )
