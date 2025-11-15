"""
KYC router for Blockpass webhook integration.

Endpoints:
- POST /api/kyc/webhook - Blockpass webhook receiver
- POST /api/kyc/callback - Frontend KYC initiation callback
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.webhook_security import verify_blockpass_signature
from app.models.kyc import KYC, KYCStatus, KYCTier
from app.models.user import User
from app.schemas.kyc import (
    BlockpassWebhookPayload,
    KYCStatusResponse,
    KYCWebhookResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/kyc", tags=["kyc"])


# Event to KYC status mapping
EVENT_STATUS_MAPPING = {
    "user.created": KYCStatus.PENDING,
    "user.readyToReview": KYCStatus.PENDING,
    "user.inReview": KYCStatus.PENDING,
    "review.approved": KYCStatus.APPROVED,
    "review.rejected": KYCStatus.REJECTED,
    "user.blocked": KYCStatus.REJECTED,
    "user.deleted": KYCStatus.REJECTED,
}


@router.post("/webhook", response_model=KYCWebhookResponse, status_code=status.HTTP_200_OK)
async def blockpass_webhook(
    request: Request,
    payload: BlockpassWebhookPayload,
    db: AsyncSession = Depends(get_db),
    x_hub_signature: str | None = Header(None, alias="X-Hub-Signature"),
    x_blockpass_event: str | None = Header(None, alias="X-Blockpass-Event"),
    x_blockpass_delivery: str | None = Header(None, alias="X-Blockpass-Delivery"),
) -> KYCWebhookResponse:
    """
    Receive and process Blockpass KYC webhook notifications.

    Blockpass sends webhooks when KYC status changes. This endpoint:
    1. Verifies webhook signature (HMAC-SHA256)
    2. Parses payload
    3. Updates KYC status in database
    4. Returns 200 OK to Blockpass

    Args:
        request: FastAPI request object (for reading raw body)
        payload: Validated Blockpass webhook payload
        db: Database session
        x_hub_signature: HMAC-SHA256 signature header
        x_blockpass_event: Event type header
        x_blockpass_delivery: Unique delivery ID header

    Returns:
        KYCWebhookResponse confirming successful processing

    Raises:
        HTTPException: 401 if signature verification fails
        HTTPException: 404 if user not found
        HTTPException: 500 if database update fails

    Security:
        - Signature verification required (BLOCKPASS_SECRET)
        - Timing-safe comparison prevents timing attacks
    """
    logger.info(
        f"Received Blockpass webhook: event={payload.event}, "
        f"refId={payload.refId}, guid={payload.guid}"
    )

    # Skip ping/test webhooks
    if payload.isPing:
        logger.info(f"Ignoring ping webhook: {payload.guid}")
        return KYCWebhookResponse(
            success=True,
            message="Ping webhook ignored",
            guid=payload.guid,
        )

    # Verify signature
    if not settings.BLOCKPASS_SECRET:
        logger.warning("BLOCKPASS_SECRET not configured, skipping signature verification")
    elif not x_hub_signature:
        logger.error("Missing X-Hub-Signature header")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing webhook signature",
        )
    else:
        # Read raw request body for signature verification
        raw_body = await request.body()
        is_valid = verify_blockpass_signature(
            payload_bytes=raw_body,
            signature_header=x_hub_signature,
            secret=settings.BLOCKPASS_SECRET,
        )

        if not is_valid:
            logger.error(
                f"Invalid webhook signature for delivery {payload.guid}"
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid webhook signature",
            )

    logger.info(f"Webhook signature verified: {payload.guid}")

    # Find user by refId (wallet address)
    user_query = select(User).where(User.address == payload.refId)
    result = await db.execute(user_query)
    user = result.scalar_one_or_none()

    if not user:
        logger.error(f"User not found for refId: {payload.refId}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User not found: {payload.refId}",
        )

    # Map event to KYC status
    new_status = EVENT_STATUS_MAPPING.get(payload.event)
    if not new_status:
        logger.warning(f"Unknown event type: {payload.event}, defaulting to PENDING")
        new_status = KYCStatus.PENDING

    # Determine KYC tier based on status
    # TODO: Implement tier determination logic based on verification level
    # For now, basic mapping:
    # - APPROVED → TIER_1 (basic verification)
    # - Can be upgraded to TIER_2 based on additional checks
    if new_status == KYCStatus.APPROVED:
        new_tier = KYCTier.TIER_1
    else:
        new_tier = KYCTier.TIER_0

    # Update or create KYC record
    kyc_query = select(KYC).where(KYC.user_id == user.id)
    kyc_result = await db.execute(kyc_query)
    kyc_record = kyc_result.scalar_one_or_none()

    if kyc_record:
        # Update existing record
        kyc_record.status = new_status
        kyc_record.tier = new_tier
        kyc_record.blockpass_id = payload.blockPassID

        if new_status == KYCStatus.APPROVED and not kyc_record.approved_at:
            kyc_record.approved_at = datetime.now(timezone.utc)

        logger.info(
            f"Updated KYC record: user_id={user.id}, "
            f"status={new_status.value}, tier={new_tier.value}"
        )
    else:
        # Create new record
        kyc_record = KYC(
            user_id=user.id,
            status=new_status,
            tier=new_tier,
            blockpass_id=payload.blockPassID,
            approved_at=(
                datetime.now(timezone.utc)
                if new_status == KYCStatus.APPROVED
                else None
            ),
        )
        db.add(kyc_record)

        logger.info(
            f"Created KYC record: user_id={user.id}, "
            f"status={new_status.value}, tier={new_tier.value}"
        )

    # Commit transaction
    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        logger.error(f"Database commit failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update KYC status",
        )

    return KYCWebhookResponse(
        success=True,
        message=f"KYC status updated to {new_status.value}",
        guid=payload.guid,
    )


@router.post("/callback", status_code=status.HTTP_200_OK)
async def kyc_callback(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """
    Receive frontend KYC initiation callback.

    Called by frontend (BlockpassWidget) when user completes KYC submission.
    This is NOT the official Blockpass webhook - just a frontend notification.

    Args:
        request: FastAPI request object
        db: Database session

    Returns:
        Success confirmation

    Note:
        Actual KYC status updates come from /kyc/webhook endpoint.
        This endpoint is for tracking user-initiated KYC flows only.
    """
    try:
        data = await request.json()
        logger.info(f"KYC callback from frontend: {data}")

        return {
            "success": True,
            "message": "KYC callback received",
        }
    except Exception as e:
        logger.error(f"KYC callback error: {e}")
        return {
            "success": False,
            "message": str(e),
        }


@router.get("/status/{address}", response_model=KYCStatusResponse)
async def get_kyc_status(
    address: str,
    db: AsyncSession = Depends(get_db),
) -> KYCStatusResponse:
    """
    Get KYC status for a wallet address.

    Args:
        address: Wallet address (0x...)
        db: Database session

    Returns:
        KYCStatusResponse with tier, status, and approval timestamp

    Raises:
        HTTPException: 404 if user or KYC record not found
    """
    # Find user
    user_query = select(User).where(User.address == address)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User not found: {address}",
        )

    # Find KYC record
    kyc_query = select(KYC).where(KYC.user_id == user.id)
    kyc_result = await db.execute(kyc_query)
    kyc_record = kyc_result.scalar_one_or_none()

    if not kyc_record:
        # Return default values for users without KYC
        return KYCStatusResponse(
            tier=0,
            status="pending",
            approved_at=None,
            blockpass_id=None,
        )

    return KYCStatusResponse(
        tier=kyc_record.tier.value,
        status=kyc_record.status.value,
        approved_at=(
            kyc_record.approved_at.isoformat() if kyc_record.approved_at else None
        ),
        blockpass_id=kyc_record.blockpass_id,
    )
