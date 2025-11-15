"""
WebSocket connection manager for Socket.IO.

Manages user rooms and message broadcasting.
"""

import logging
from typing import Dict, Set

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages WebSocket connections and rooms.

    Each user has a dedicated room (user_address).
    """

    def __init__(self):
        """Initialize connection manager."""
        self.active_connections: Dict[str, Set[str]] = {}  # {user_address: {session_ids}}

    async def connect(self, user_address: str, session_id: str) -> None:
        """
        Register new connection.

        Args:
            user_address: User wallet address
            session_id: Socket.IO session ID
        """
        if user_address not in self.active_connections:
            self.active_connections[user_address] = set()

        self.active_connections[user_address].add(session_id)
        logger.info(f"User {user_address[:10]}... connected (session: {session_id[:8]}...)")

    async def disconnect(self, user_address: str, session_id: str) -> None:
        """
        Unregister connection.

        Args:
            user_address: User wallet address
            session_id: Socket.IO session ID
        """
        if user_address in self.active_connections:
            self.active_connections[user_address].discard(session_id)

            if not self.active_connections[user_address]:
                del self.active_connections[user_address]

        logger.info(f"User {user_address[:10]}... disconnected")

    def get_room(self, user_address: str) -> str:
        """
        Get room name for user.

        Args:
            user_address: User wallet address

        Returns:
            Room name (user_address)
        """
        return user_address.lower()

    def is_user_connected(self, user_address: str) -> bool:
        """
        Check if user is connected.

        Args:
            user_address: User wallet address

        Returns:
            True if user has active connections
        """
        return user_address in self.active_connections and len(self.active_connections[user_address]) > 0


# Global instance
manager = ConnectionManager()
