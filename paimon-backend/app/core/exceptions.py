"""
Custom exceptions and global exception handlers for FastAPI.

Provides unified error response format and centralized exception handling.
"""

from typing import Any

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.core.logger import get_logger

logger = get_logger(__name__)


class ErrorResponse(BaseModel):
    """Standard error response model."""

    code: int
    message: str
    details: dict[str, Any] | None = None


class APIResponse(BaseModel):
    """Standard API response wrapper."""

    success: bool
    error: ErrorResponse | None = None
    data: dict[str, Any] | None = None


class APIException(Exception):
    """Base exception class for API errors."""

    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: dict[str, Any] | None = None,
    ):
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(self.message)


class NotFoundException(APIException):
    """Exception raised when a resource is not found."""

    def __init__(self, resource: str, identifier: str | int):
        message = f"{resource} with identifier '{identifier}' not found"
        super().__init__(message=message, status_code=status.HTTP_404_NOT_FOUND)


class UnauthorizedException(APIException):
    """Exception raised when authentication fails."""

    def __init__(self, message: str = "Authentication required"):
        super().__init__(message=message, status_code=status.HTTP_401_UNAUTHORIZED)


class ForbiddenException(APIException):
    """Exception raised when user lacks permissions."""

    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(message=message, status_code=status.HTTP_403_FORBIDDEN)


class ValidationException(APIException):
    """Exception raised for validation errors."""

    def __init__(self, message: str, details: dict[str, Any] | None = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details,
        )


def setup_exception_handlers(app: FastAPI) -> None:
    """
    Register global exception handlers for the FastAPI app.

    Args:
        app: FastAPI application instance
    """

    @app.exception_handler(APIException)
    async def api_exception_handler(request: Request, exc: APIException):
        """Handle custom API exceptions."""
        logger.error(
            f"API Exception: {exc.message} (status={exc.status_code})",
            extra={"path": request.url.path, "method": request.method},
        )

        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": {
                    "code": exc.status_code,
                    "message": exc.message,
                    "details": exc.details,
                },
            },
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        """Handle FastAPI HTTPException."""
        logger.error(
            f"HTTP Exception: {exc.detail} (status={exc.status_code})",
            extra={"path": request.url.path, "method": request.method},
        )

        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": {
                    "code": exc.status_code,
                    "message": exc.detail,
                },
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ):
        """Handle Pydantic validation errors."""
        errors = exc.errors()
        logger.warning(
            f"Validation Error: {len(errors)} validation error(s)",
            extra={"path": request.url.path, "errors": errors},
        )

        # Format validation errors
        formatted_errors = []
        for error in errors:
            formatted_errors.append(
                {
                    "field": ".".join(str(loc) for loc in error["loc"]),
                    "message": error["msg"],
                    "type": error["type"],
                }
            )

        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "success": False,
                "error": {
                    "code": status.HTTP_422_UNPROCESSABLE_ENTITY,
                    "message": "Validation error",
                    "details": {"errors": formatted_errors},
                },
            },
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        """Handle unexpected exceptions."""
        logger.exception(
            f"Unexpected Exception: {str(exc)}",
            extra={"path": request.url.path, "method": request.method},
        )

        # In production, don't expose internal error details
        from app.core.config import settings

        if settings.ENVIRONMENT == "production":
            message = "Internal server error"
        else:
            message = f"Internal server error: {str(exc)}"

        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": {
                    "code": status.HTTP_500_INTERNAL_SERVER_ERROR,
                    "message": message,
                },
            },
        )
