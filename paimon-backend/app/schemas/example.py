"""
Example Pydantic schemas for API documentation.

These schemas demonstrate best practices for API documentation
with field descriptions and examples.
"""

from pydantic import BaseModel, Field


class ExampleRequest(BaseModel):
    """Example request schema with field descriptions and examples."""

    name: str = Field(
        ...,
        description="User's full name",
        examples=["Alice Johnson", "Bob Smith"],
        min_length=1,
        max_length=100,
    )
    email: str = Field(
        ...,
        description="User's email address",
        examples=["alice@example.com"],
        pattern=r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$",
    )
    age: int | None = Field(
        None,
        description="User's age (optional)",
        examples=[25, 30],
        ge=0,
        le=150,
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "name": "Alice Johnson",
                    "email": "alice@example.com",
                    "age": 25,
                }
            ]
        }
    }


class ExampleResponse(BaseModel):
    """Example response schema with field descriptions and examples."""

    id: int = Field(
        ...,
        description="Unique identifier",
        examples=[1, 42],
        gt=0,
    )
    name: str = Field(
        ...,
        description="User's full name",
        examples=["Alice Johnson"],
    )
    email: str = Field(
        ...,
        description="User's email address",
        examples=["alice@example.com"],
    )
    age: int | None = Field(
        None,
        description="User's age (if provided)",
        examples=[25],
    )
    status: str = Field(
        default="active",
        description="User status",
        examples=["active", "inactive"],
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": 1,
                    "name": "Alice Johnson",
                    "email": "alice@example.com",
                    "age": 25,
                    "status": "active",
                }
            ]
        }
    }


class ErrorResponse(BaseModel):
    """Error response schema."""

    success: bool = Field(
        default=False,
        description="Indicates if the request was successful",
        examples=[False],
    )
    error: dict = Field(
        ...,
        description="Error details",
        examples=[
            {
                "code": 404,
                "message": "Resource not found",
                "details": None,
            }
        ],
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "success": False,
                    "error": {
                        "code": 404,
                        "message": "User with identifier '123' not found",
                        "details": None,
                    },
                }
            ]
        }
    }
