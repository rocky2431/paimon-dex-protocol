"""
Main FastAPI application.

Initializes FastAPI app with middleware, routers, and configuration.
"""

from contextlib import asynccontextmanager
from datetime import datetime, UTC

import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.core.config import settings
from app.core.database import engine
from app.core.cache import redis_client
from app.routers import auth, user, kyc, features, tasks, points, referral, portfolio, historical, leaderboard, redemption, analytics, social_auth
from app.websocket.events import sio


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.

    Handles application initialization and cleanup.
    """
    # Startup
    print(f"🚀 Starting {settings.PROJECT_NAME} v{settings.VERSION}")
    print(f"📝 Environment: {settings.ENVIRONMENT}")
    print("📚 API Docs: /docs")
    print("📖 ReDoc: /redoc")

    yield

    # Shutdown
    print(f"👋 Shutting down {settings.PROJECT_NAME}")


# Create FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    contact={
        "name": "Paimon DEX Team",
        "email": "support@paimon.dex",
    },
    license_info={
        "name": "MIT License",
    },
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(user.router)
app.include_router(kyc.router)
app.include_router(features.router)
app.include_router(tasks.router)
app.include_router(points.router)
app.include_router(referral.router)
app.include_router(portfolio.router)
app.include_router(historical.router)
app.include_router(leaderboard.router)
app.include_router(redemption.router)
app.include_router(analytics.router)
app.include_router(social_auth.router)


# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """
    Root endpoint - API information.

    Returns:
        dict: API name, version, and status.
    """
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "running",
        "environment": settings.ENVIRONMENT,
    }


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """
    Enhanced health check endpoint for deployment verification.

    Checks:
    - Database connection status
    - Redis connection status
    - Overall service health

    Returns:
        dict: Comprehensive service health status with DB and Redis connectivity.
    """
    health_status = {
        "status": "healthy",
        "service": "paimon-backend",
        "timestamp": datetime.now(UTC).isoformat(),
        "database": {"connected": False},
        "redis": {"connected": False},
    }

    # Check database connection
    try:
        async with engine.connect() as conn:
            # Simple ping to verify connection
            await conn.execute(text("SELECT 1"))
            health_status["database"]["connected"] = True
    except Exception as e:
        health_status["database"]["connected"] = False
        health_status["database"]["error"] = str(e)
        health_status["status"] = "degraded"

    # Check Redis connection
    try:
        await redis_client.ping()
        health_status["redis"]["connected"] = True
    except Exception as e:
        health_status["redis"]["connected"] = False
        health_status["redis"]["error"] = str(e)
        health_status["status"] = "degraded"

    return health_status


# Exception handler for generic errors
@app.exception_handler(Exception)
async def generic_exception_handler(request, exc):
    """
    Generic exception handler for uncaught exceptions.

    Args:
        request: FastAPI request object.
        exc: Exception instance.

    Returns:
        JSONResponse: Error response with status 500.
    """
    if settings.DEBUG:
        # In debug mode, show full error details
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal Server Error",
                "detail": str(exc),
                "type": type(exc).__name__,
            },
        )
    else:
        # In production, hide error details
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal Server Error",
                "detail": "An unexpected error occurred",
            },
        )


# Wrap FastAPI app with Socket.IO
# This creates a single ASGI app that handles both HTTP (FastAPI) and WebSocket (Socket.IO)
socket_app = socketio.ASGIApp(sio, app)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:socket_app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info" if settings.DEBUG else "warning",
    )
