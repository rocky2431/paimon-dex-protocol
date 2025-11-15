"""Event handlers for blockchain indexing."""

from app.indexer.handlers.dex_handler import DEXEventHandler
from app.indexer.handlers.vault_handler import VaultEventHandler

__all__ = ["DEXEventHandler", "VaultEventHandler"]
