"""
RWA Task Verifiers.

Collection of task-specific verifiers.
"""

from app.services.rwa_task.verifiers.hold_rwa_asset import HoldRWAAssetVerifier

__all__ = [
    "HoldRWAAssetVerifier",
]
