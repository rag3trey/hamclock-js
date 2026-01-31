"""
WebSocket connection manager for real-time updates
"""

from fastapi import WebSocket
from typing import List, Dict, Set, Optional, Any
import json
from datetime import datetime
import asyncio


class WebSocketManager:
    """Manage WebSocket connections and subscriptions"""
    
    def __init__(self):
        # Active connections
        self.active_connections: List[WebSocket] = []
        
        # Subscriptions: channel -> set of websockets
        self.subscriptions: Dict[str, Set[WebSocket]] = {}
        
        # Client metadata: websocket -> {channels: set, user_id: str}
        self.client_metadata: Dict[WebSocket, Dict] = {}
    
    async def connect(self, websocket: WebSocket):
        """Accept new WebSocket connection"""
        await websocket.accept()
        self.active_connections.append(websocket)
        self.client_metadata[websocket] = {'channels': set()}
        print(f"✅ WebSocket connected. Total connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        """Remove WebSocket connection"""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        
        # Remove from all subscriptions
        if websocket in self.client_metadata:
            channels = self.client_metadata[websocket].get('channels', set())
            for channel in channels:
                if channel in self.subscriptions:
                    self.subscriptions[channel].discard(websocket)
            del self.client_metadata[websocket]
        
        print(f"❌ WebSocket disconnected. Total connections: {len(self.active_connections)}")
    
    async def subscribe(self, websocket: WebSocket, channel: str):
        """Subscribe websocket to a channel"""
        if channel not in self.subscriptions:
            self.subscriptions[channel] = set()
        
        self.subscriptions[channel].add(websocket)
        if websocket in self.client_metadata:
            self.client_metadata[websocket]['channels'].add(channel)
        
        print(f"📡 WebSocket subscribed to {channel}. Subscribers: {len(self.subscriptions[channel])}")
    
    async def unsubscribe(self, websocket: WebSocket, channel: str):
        """Unsubscribe websocket from a channel"""
        if channel in self.subscriptions and websocket in self.subscriptions[channel]:
            self.subscriptions[channel].discard(websocket)
            if websocket in self.client_metadata:
                self.client_metadata[websocket]['channels'].discard(channel)
            print(f"🔇 WebSocket unsubscribed from {channel}")
    
    async def broadcast(self, message: Dict[str, Any], channel: Optional[str] = None):
        """
        Broadcast message to all connections or specific channel
        
        Args:
            message: Message to broadcast (should have 'type' key)
            channel: If specified, only send to subscribers of this channel
        """
        if channel and channel in self.subscriptions:
            # Broadcast to channel subscribers
            connections = self.subscriptions[channel]
        else:
            # Broadcast to all
            connections = self.active_connections
        
        # Add timestamp if not present
        if 'timestamp' not in message:
            message['timestamp'] = datetime.utcnow().isoformat()
        
        # Send to all connections
        dead_connections = []
        for connection in connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"Error sending to WebSocket: {e}")
                dead_connections.append(connection)
        
        # Clean up dead connections
        for connection in dead_connections:
            self.disconnect(connection)
    
    async def send_personal_message(self, message: Dict[str, Any], websocket: WebSocket):
        """Send message to specific websocket"""
        if 'timestamp' not in message:
            message['timestamp'] = datetime.utcnow().isoformat()
        
        try:
            await websocket.send_json(message)
        except Exception as e:
            print(f"Error sending personal message: {e}")
            self.disconnect(websocket)
    
    def get_subscriber_count(self, channel: str) -> int:
        """Get number of subscribers to a channel"""
        return len(self.subscriptions.get(channel, set()))
    
    def get_active_channels(self) -> Dict[str, int]:
        """Get all active channels and their subscriber counts"""
        return {channel: len(subs) for channel, subs in self.subscriptions.items() if subs}

