from collections import defaultdict
from typing import DefaultDict

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: DefaultDict[str, list[WebSocket]] = defaultdict(list)
        self._rider_connections: DefaultDict[str, list[WebSocket]] = defaultdict(list)

    async def connect(self, ride_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections[ride_id].append(websocket)

    async def connect_rider(self, rider_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self._rider_connections[rider_id].append(websocket)

    def disconnect_rider(self, rider_id: str, websocket: WebSocket) -> None:
        if rider_id in self._rider_connections and websocket in self._rider_connections[rider_id]:
            self._rider_connections[rider_id].remove(websocket)
            if not self._rider_connections[rider_id]:
                del self._rider_connections[rider_id]

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

    async def broadcast_to_rider(self, rider_id: str, payload: dict) -> None:
        if rider_id not in self._rider_connections:
            return
        dead_sockets = []
        for connection in self._rider_connections[rider_id]:
            try:
                await connection.send_json(payload)
            except Exception:
                dead_sockets.append(connection)
        for ws in dead_sockets:
            self.disconnect_rider(rider_id, ws)

    async def broadcast_to_all_riders(self, payload: dict) -> None:
        for rider_id in list(self._rider_connections.keys()):
            await self.broadcast_to_rider(rider_id, payload)


realtime_manager = ConnectionManager()
