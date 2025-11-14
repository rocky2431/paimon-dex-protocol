"""
FastAPI middleware for unified response format and request logging.

Provides automatic response wrapping, request logging, and timing tracking.
"""

import time
import uuid
from collections.abc import Callable
from datetime import UTC, datetime

from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.logger import get_logger

logger = get_logger(__name__)


class ResponseFormatterMiddleware(BaseHTTPMiddleware):
    """
    Middleware to wrap API responses in a unified format.

    Wraps successful responses in:
    {
        "success": true,
        "data": <original_response>,
        "timestamp": <iso_timestamp>,
        "request_id": <uuid>
    }
    """

    # Paths to exclude from response wrapping
    EXCLUDED_PATHS = [
        "/health",
        "/docs",
        "/redoc",
        "/openapi.json",
    ]

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request and wrap response."""
        # Generate request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        # Track request start time
        start_time = time.time()

        # Call next middleware/handler
        response = await call_next(request)

        # Calculate response time
        response_time = time.time() - start_time

        # Log request
        logger.info(
            f"{request.method} {request.url.path} - {response.status_code} "
            f"({response_time:.3f}s)",
            extra={
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "response_time": response_time,
                "request_id": request_id,
            },
        )

        # Skip wrapping for excluded paths
        if any(request.url.path.startswith(path) for path in self.EXCLUDED_PATHS):
            return response

        # Skip wrapping for non-200 status codes (errors are already wrapped)
        if response.status_code >= 400:
            return response

        # Skip wrapping if response is not JSON
        if "application/json" not in response.headers.get("content-type", ""):
            return response

        # Read original response body
        response_body = b""
        async for chunk in response.body_iterator:
            response_body += chunk

        # Try to parse as JSON
        try:
            import json

            original_data = json.loads(response_body.decode())

            # Check if already wrapped (has 'success' field)
            if isinstance(original_data, dict) and "success" in original_data:
                # Already wrapped, return as-is
                return Response(
                    content=response_body,
                    status_code=response.status_code,
                    headers=dict(response.headers),
                    media_type=response.media_type,
                )

            # Wrap response
            wrapped_response = {
                "success": True,
                "data": original_data,
                "timestamp": datetime.now(UTC).isoformat(),
                "request_id": request_id,
            }

            return JSONResponse(
                content=wrapped_response,
                status_code=response.status_code,
            )

        except (json.JSONDecodeError, UnicodeDecodeError):
            # Not JSON or decode error, return original
            return Response(
                content=response_body,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.media_type,
            )


def setup_middleware(app: FastAPI) -> None:
    """
    Setup all middleware for the FastAPI app.

    Args:
        app: FastAPI application instance
    """
    # Add response formatter middleware
    app.add_middleware(ResponseFormatterMiddleware)

    logger.info("Middleware configured: ResponseFormatterMiddleware")
