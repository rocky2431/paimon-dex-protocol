"""
TaskOn API schemas.

Pydantic models for TaskOn verification API.
"""

from pydantic import BaseModel, Field


class TaskOnVerificationResponse(BaseModel):
    """
    TaskOn verification API response.

    Response format required by TaskOn platform.
    """

    result: dict[str, bool] = Field(
        ...,
        description="Verification result",
        examples=[{"isValid": True}, {"isValid": False}],
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {"result": {"isValid": True}},
                {"result": {"isValid": False}},
            ]
        }
    }
