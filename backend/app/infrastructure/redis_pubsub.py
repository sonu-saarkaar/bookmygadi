import json
import asyncio
from typing import Dict, Set, Callable
import aioredis
from fastapi import WebSocket

class RedisPubSubManager:
    """
    Distributed WebSocket Manager using Redis Pub/Sub.
    Allows multiple FastAPI instances to synchronize WebSocket broadcasts.
    """
    def __init__(self, redis_url: str = "redis://localhost:6379/0"):
        self.redis_url = redis_url
        self.redis = None
        self.pubsub = None
        self.local_connections: Dict[str, Set[WebSocket]] = {}
        self.node_id = "fastapi-node-" + str(id(self))

    async def connect(self):
        self.redis = await aioredis.from_url(self.redis_url)
        self.pubsub = self.redis.pubsub()
        await self.pubsub.subscribe("global_ws_events")
        asyncio.create_task(self._listen())

    async def _listen(self):
        async for message in self.pubsub.listen():
            if message["type"] == "message":
                data = json.loads(message["data"])
                target_user = data.get("target_user")
                payload = data.get("payload")
                
                # If target_user is connected to THIS specific FastAPI node, send it.
                if target_user in self.local_connections:
                    for ws in self.local_connections[target_user]:
                        try:
                            await ws.send_json(payload)
                        except Exception:
                            pass

    async def connect_websocket(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.local_connections:
            self.local_connections[user_id] = set()
        self.local_connections[user_id].add(websocket)

    def disconnect_websocket(self, user_id: str, websocket: WebSocket):
        if user_id in self.local_connections:
            self.local_connections[user_id].discard(websocket)
            if not self.local_connections[user_id]:
                del self.local_connections[user_id]

    async def broadcast_to_user(self, user_id: str, payload: dict):
        """
        Publishes event to Redis. Whichever node holds the WebSocket will deliver it.
        """
        message = {
            "target_user": user_id,
            "payload": payload,
            "origin_node": self.node_id
        }
        await self.redis.publish("global_ws_events", json.dumps(message))

redis_ws_manager = RedisPubSubManager()
