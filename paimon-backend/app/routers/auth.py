"""
Authentication routes for wallet signature login and social OAuth.

Endpoints:
- GET /api/auth/nonce: Generate nonce for signing
- POST /api/auth/login: Wallet signature login
- POST /api/auth/social: Social OAuth login (Email/Google/X)
"""

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.nonce import DEFAULT_NONCE_TTL, consume_nonce, generate_nonce, validate_nonce
from app.core.security import create_access_token, create_refresh_token
from app.core.social_oauth import get_or_create_user, link_wallet_address, verify_oauth_token
from app.core.wallet import verify_signature
from app.schemas.auth import (
    LoginRequest,
    NonceResponse,
    SocialLoginRequest,
    SocialLoginResponse,
    TokenResponse,
)

# Constants
ETHEREUM_ADDRESS_LENGTH = 42
REFRESH_TOKEN_COOKIE_MAX_AGE = 7 * 24 * 60 * 60  # 7 days in seconds

router = APIRouter(prefix="/api/auth", tags=["authentication"])


@router.get("/nonce", response_model=NonceResponse, status_code=status.HTTP_200_OK)
async def get_nonce(address: str) -> NonceResponse:
    """
    Generate a nonce for wallet signature.

    Args:
        address: Ethereum wallet address.

    Returns:
        NonceResponse: Generated nonce with expiration info.

    Example:
        GET /api/auth/nonce?address=0x1234567890abcdef...
        Response: {"nonce": "a1b2c3d4...", "address": "0x1234...", "expires_in": 300}
    """
    # Validate address format (basic check)
    if not address.startswith("0x") or len(address) != ETHEREUM_ADDRESS_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Ethereum address format",
        )

    # Generate nonce
    nonce = await generate_nonce(address)

    return NonceResponse(nonce=nonce, address=address, expires_in=DEFAULT_NONCE_TTL)


@router.post("/login", response_model=TokenResponse, status_code=status.HTTP_200_OK)
async def login(request: LoginRequest, response: Response) -> TokenResponse:
    """
    Authenticate user with wallet signature.

    Flow:
    1. Validate nonce (check existence and not expired)
    2. Verify signature matches address
    3. Consume nonce (prevent reuse)
    4. Generate JWT tokens
    5. Set httpOnly cookie with refresh token

    Args:
        request: Login request with address, message, signature, nonce.
        response: FastAPI Response object for setting cookies.

    Returns:
        TokenResponse: Access token and refresh token.

    Raises:
        HTTPException: 400 if nonce invalid, 401 if signature invalid.

    Example:
        POST /api/auth/login
        Body: {
            "address": "0x1234...",
            "message": "Sign this message to login",
            "signature": "0xabcdef...",
            "nonce": "a1b2c3d4..."
        }
    """
    # Step 1: Validate nonce
    is_nonce_valid = await validate_nonce(request.address, request.nonce)

    if not is_nonce_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired nonce",
        )

    # Step 2: Verify signature
    is_signature_valid = verify_signature(
        message=request.message, signature=request.signature, expected_address=request.address
    )

    if not is_signature_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid signature",
        )

    # Step 3: Consume nonce (prevent reuse)
    consumed = await consume_nonce(request.address, request.nonce)

    if not consumed:
        # Nonce was already consumed (double use attempt)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nonce already used",
        )

    # Step 4: Generate JWT tokens
    token_data = {"sub": request.address}  # Subject = wallet address

    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    # Step 5: Set httpOnly cookie with refresh token
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,  # Prevent JavaScript access (XSS protection)
        secure=True,  # Only send over HTTPS in production
        samesite="lax",  # CSRF protection
        max_age=REFRESH_TOKEN_COOKIE_MAX_AGE,  # 7 days (same as refresh token TTL)
    )

    return TokenResponse(
        access_token=access_token, refresh_token=refresh_token, token_type="bearer"
    )


@router.post("/social", response_model=SocialLoginResponse, status_code=status.HTTP_200_OK)
async def social_login(
    request: SocialLoginRequest, response: Response, db: AsyncSession = Depends(get_db)
) -> SocialLoginResponse:
    """
    Authenticate user with social OAuth (Email/Google/X).

    Flow:
    1. Verify OAuth token with provider API
    2. Get or create user from OAuth data
    3. Link wallet address if provided
    4. Generate JWT tokens
    5. Set httpOnly cookie with refresh token

    Args:
        request: Social login request with provider, token, and optional address.
        response: FastAPI Response object for setting cookies.
        db: Database session.

    Returns:
        SocialLoginResponse: Access token, refresh token, and user info.

    Raises:
        HTTPException: 401 if token invalid, 400 if provider unsupported.

    Example:
        POST /api/auth/social
        Body: {
            "provider": "google",
            "token": "ya29.a0AfH6SMB...",
            "address": "0x1234..." (optional)
        }
    """
    # Step 1: Verify OAuth token with provider
    oauth_data = await verify_oauth_token(request.token, request.provider)

    if oauth_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid {request.provider} OAuth token",
        )

    # Step 2: Get or create user from OAuth data
    user = await get_or_create_user(oauth_data, request.provider, db)

    # Step 3: Link wallet address if provided
    if request.address and user.address != request.address.lower():
        user = await link_wallet_address(user, request.address, db)

    # Step 4: Generate JWT tokens
    # Use wallet address as subject if available, otherwise use user ID
    token_subject = user.address if user.address else f"user_{user.id}"
    token_data = {"sub": token_subject, "user_id": user.id}

    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    # Step 5: Set httpOnly cookie with refresh token
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=REFRESH_TOKEN_COOKIE_MAX_AGE,
    )

    # Build user info response
    user_info = {
        "id": user.id,
        "address": user.address,
        "email": user.email,
        "social_provider": user.social_provider,
        "referral_code": user.referral_code,
    }

    return SocialLoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=user_info,
    )
