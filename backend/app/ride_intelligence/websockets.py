from fastapi import WebSocket, WebSocketDisconnect, APIRouter
from typing import Dict
import json

# Real-time WebSockets for Negotiation and Matching

router = APIRouter(tags=["ride_intelligence_ws"])

class RideIntelligenceConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]

    async def send_personal_message(self, message: str, user_id: str):
        ws = self.active_connections.get(user_id)
        if ws:
            await ws.send_text(message)

manager = RideIntelligenceConnectionManager()

@router.websocket("/ws/negotiation/{user_id}")
async def websocket_negotiation(websocket: WebSocket, user_id: str):
    await manager.connect(user_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Logic to handle live counter offers
            payload = json.loads(data)
            target_id = payload.get("target_id")
            if target_id:
                await manager.send_personal_message(json.dumps({
                    "event": "new_offer",
                    "ride_id": payload.get("ride_id"),
                    "amount": payload.get("amount")
                }), target_id)
    except WebSocketDisconnect:
        manager.disconnect(user_id)
