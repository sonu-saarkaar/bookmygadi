from collections import defaultdict
from typing import DefaultDict

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: DefaultDict[str, list[WebSocket]] = defaultdict(list)

    async def connect(self, ride_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections[ride_id].append(websocket)

    def disconnect(self, ride_id: str, websocket: WebSocket) -> None:
        if ride_id not in self._connections:
            return

        if websocket in self._connections[ride_id]:
            self._connections[ride_id].remove(websocket)

        if not self._connections[ride_id]:
            del self._connections[ride_id]

    async def broadcast(self, ride_id: str, payload: dict) -> None:
        if ride_id not in self._connections:
            return

        dead_sockets: list[WebSocket] = []
        for connection in self._connections[ride_id]:
            try:
                await connection.send_json(payload)
            except Exception:
                dead_sockets.append(connection)

        for ws in dead_sockets:
            self.disconnect(ride_id, ws)


realtime_manager = ConnectionManager()
