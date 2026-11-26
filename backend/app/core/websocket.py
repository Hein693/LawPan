from typing import List, Dict, Any
from fastapi import WebSocket
import json
import logging

logger = logging.getLogger("lawpan.websocket")

class ConnectionManager:
    """
    Manages WebSocket connections for real-time internal updates across panels:
    Kitchen tickets, Table status changes, Order updates, and Billing notifications.
    """
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Total clients: {len(self.active_connections)}")

    async def broadcast(self, message: Dict[str, Any]):
        """
        Broadcast message to all connected clients.
        Format: {"type": "ORDER_CREATED"|"KITCHEN_UPDATED"|"TABLE_STATUS", "payload": {...}}
        """
        json_msg = json.dumps(message)
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_text(json_msg)
            except Exception as e:
                logger.warning(f"Failed to send to client: {e}")
                dead_connections.append(connection)
        
        for dead in dead_connections:
            if dead in self.active_connections:
                self.active_connections.remove(dead)

manager = ConnectionManager()
