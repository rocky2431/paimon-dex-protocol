"""Points Redemption API."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from datetime import datetime, UTC

from app.core.database import get_db
from app.models.user import User
from app.models.points import PointsBalance
from app.config.points_rules import RedemptionItem, REDEMPTION_COSTS
from app.services.points import PointsService

router = APIRouter(prefix="/api/redemption", tags=["Redemption"])


class RedeemRequest(BaseModel):
    """Redemption request."""
    user_address: str
    item: RedemptionItem


class RedeemResponse(BaseModel):
    """Redemption response."""
    success: bool
    item: str
    points_spent: int
    remaining_points: int
    redeemed_at: str


@router.post("", response_model=RedeemResponse)
async def redeem_points(
    request: RedeemRequest,
    db: AsyncSession = Depends(get_db),
) -> RedeemResponse:
    """Redeem points for rewards."""

    # Get user
    stmt = select(User).where(User.wallet_address == request.user_address.lower())
    user = (await db.execute(stmt)).scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")

    # Get points balance
    balance_stmt = select(PointsBalance).where(PointsBalance.user_id == user.id)
    balance = (await db.execute(balance_stmt)).scalar_one_or_none()
    if not balance:
        raise HTTPException(400, "No points balance")

    # Check item cost
    cost = REDEMPTION_COSTS.get(request.item)
    if not cost:
        raise HTTPException(400, f"Invalid redemption item: {request.item}")

    # Check sufficient points
    available = balance.total_earned - balance.total_spent
    if available < cost:
        raise HTTPException(400, f"Insufficient points: have {available}, need {cost}")

    # Deduct points
    points_service = PointsService(db)
    await points_service.spend_points(
        user_id=user.id,
        amount=cost,
        reason=f"redemption:{request.item}",
        metadata={"item": request.item},
    )

    # Update balance
    balance.total_spent += cost
    await db.commit()

    return RedeemResponse(
        success=True,
        item=request.item,
        points_spent=cost,
        remaining_points=balance.total_earned - balance.total_spent,
        redeemed_at=datetime.now(UTC).isoformat(),
    )


@router.get("/catalog", response_model=dict)
async def get_redemption_catalog() -> dict:
    """Get available redemption items."""
    return {
        "items": [
            {"id": item, "cost": cost, "name": item.replace("_", " ").title()}
            for item, cost in REDEMPTION_COSTS.items()
        ]
    }
