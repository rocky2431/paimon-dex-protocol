"""
Socket.IO event handlers.

Handles WebSocket events (connect, disconnect, join_room).
"""

import logging
from typing import Dict

import socketio

from app.websocket.manager import manager

logger = logging.getLogger(__name__)

# Create Socket.IO server (async mode)
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",  # Configure for production
    logger=True,
    engineio_logger=True,
)


@sio.event
async def connect(sid: str, environ: Dict, auth: Dict) -> bool:
    """
    Handle client connection.

    Args:
        sid: Session ID
        environ: WSGI environment
        auth: Authentication data (should contain user_address)

    Returns:
        True to accept, False to reject
    """
    # Extract user address from auth
    user_address = auth.get("user_address") if auth else None

    if not user_address:
        logger.warning(f"Connection rejected: no user_address in auth (sid: {sid[:8]}...)")
        return False

    # Register connection
    await manager.connect(user_address, sid)

    # Join user's personal room
    room = manager.get_room(user_address)
    await sio.enter_room(sid, room)

    logger.info(f"Client connected: {user_address[:10]}... (sid: {sid[:8]}..., room: {room[:10]}...)")
    return True


@sio.event
async def disconnect(sid: str):
    """
    Handle client disconnection.

    Args:
        sid: Session ID
    """
    # Find user by session ID
    user_address = None
    for addr, sessions in manager.active_connections.items():
        if sid in sessions:
            user_address = addr
            break

    if user_address:
        await manager.disconnect(user_address, sid)
        logger.info(f"Client disconnected: {user_address[:10]}... (sid: {sid[:8]}...)")
    else:
        logger.warning(f"Disconnect from unknown session: {sid[:8]}...")


@sio.event
async def join_room(sid: str, data: Dict):
    """
    Handle explicit room join request.

    Args:
        sid: Session ID
        data: Request data (room name)
    """
    room = data.get("room")
    if room:
        await sio.enter_room(sid, room)
        await sio.emit("room_joined", {"room": room}, room=sid)
        logger.info(f"Session {sid[:8]}... joined room: {room}")


@sio.event
async def leave_room(sid: str, data: Dict):
    """
    Handle room leave request.

    Args:
        sid: Session ID
        data: Request data (room name)
    """
    room = data.get("room")
    if room:
        await sio.leave_room(sid, room)
        await sio.emit("room_left", {"room": room}, room=sid)
        logger.info(f"Session {sid[:8]}... left room: {room}")


# Notification sending utilities
async def send_notification(user_address: str, notification: Dict) -> bool:
    """
    Send notification to user.

    Args:
        user_address: User wallet address
        notification: Notification data

    Returns:
        True if sent successfully
    """
    if not manager.is_user_connected(user_address):
        logger.debug(f"User {user_address[:10]}... not connected, skipping notification")
        return False

    room = manager.get_room(user_address)
    await sio.emit("notification", notification, room=room)
    logger.info(f"Notification sent to {user_address[:10]}...: {notification.get('type')}")
    return True
