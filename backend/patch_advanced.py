import os

def patch_file(filepath, replacements):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements:
        if old in content:
            content = content.replace(old, new)
        else:
            print(f"Warning: '{old}' not found in {filepath}")
            
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

def main():
    # 1. Update app/models.py
    models_path = "app/models.py"
    models_replacements = [
        (
            "class AuthOtp(Base, TimestampMixin):",
            "class RefreshToken(Base, TimestampMixin):\n    __tablename__ = \"refresh_tokens\"\n\n    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))\n    user_id: Mapped[str] = mapped_column(ForeignKey(\"users.id\"), index=True)\n    token: Mapped[str] = mapped_column(String(255), unique=True, index=True)\n    expires_at: Mapped[datetime] = mapped_column(DateTime, index=True)\n    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False)\n\n    user: Mapped[\"User\"] = relationship(foreign_keys=[user_id])\n\n\nclass AuthOtp(Base, TimestampMixin):"
        )
    ]
    patch_file(models_path, models_replacements)

    # 2. Update app/schemas.py
    schemas_path = "app/schemas.py"
    schemas_replacements = [
        (
            "class Token(BaseModel):\n    access_token: str\n    token_type: str = \"bearer\"",
            "class Token(BaseModel):\n    access_token: str\n    refresh_token: str | None = None\n    token_type: str = \"bearer\"\n    role: str | None = None\n\nclass RefreshRequest(BaseModel):\n    refresh_token: str"
        )
    ]
    patch_file(schemas_path, schemas_replacements)

    # 3. Update app/core/security.py
    security_path = "app/core/security.py"
    security_replacements = [
        (
            "def create_access_token(subject: str, expires_minutes: int | None = None) -> str:",
            "def create_access_token(subject: str, role: str = \"customer\", expires_minutes: int | None = None) -> str:"
        ),
        (
            "payload = {\"sub\": subject, \"exp\": expire_at}",
            "payload = {\"sub\": subject, \"role\": role, \"exp\": expire_at}"
        )
    ]
    patch_file(security_path, security_replacements)

    # 4. Update app/api/common/deps.py
    deps_path = "app/api/common/deps.py"
    deps_replacements = [
        (
            "def get_admin_user(current_user: User = Depends(get_current_user)) -> User:",
            "def require_role(allowed_roles: list[str]):\n    def role_checker(current_user: User = Depends(get_current_user)):\n        # Map our roles to internal DB roles to be flexible\n        normalized = [\"customer\" if r == \"user\" else \"driver\" if r == \"rider\" else r for r in allowed_roles]\n        if current_user.role not in normalized and current_user.role not in allowed_roles:\n            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=\"Not enough permissions\")\n        return current_user\n    return role_checker\n\n\ndef get_admin_user(current_user: User = Depends(get_current_user)) -> User:"
        )
    ]
    patch_file(deps_path, deps_replacements)

    # 5. Update app/api/common/auth.py
    auth_path = "app/api/common/auth.py"
    auth_replacements = [
        (
            "from app.models import AuthOtp, User",
            "from app.models import AuthOtp, User, RefreshToken"
        ),
        (
            "from app.schemas import Token, UserCreate, UserLogin, UserRead, ForgotPasswordRequest",
            "from app.schemas import Token, UserCreate, UserLogin, UserRead, ForgotPasswordRequest, RefreshRequest"
        ),
        (
            "token = create_access_token(subject=user.id)",
            "token = create_access_token(subject=user.id, role=user.role)"
        ),
        (
            "token = create_access_token(subject=user.id)\n    return Token(access_token=token)",
            "token = create_access_token(subject=user.id, role=user.role)\n    \n    refresh_token = secrets.token_urlsafe(32)\n    refresh_expires = datetime.utcnow() + timedelta(days=7)\n    rt = RefreshToken(user_id=user.id, token=refresh_token, expires_at=refresh_expires)\n    db.add(rt)\n    db.commit()\n\n    return Token(access_token=token, refresh_token=refresh_token, role=user.role)"
        ),
        (
            "@router.get(\"/me\", response_model=UserRead)",
            "@router.post(\"/refresh\", response_model=Token)\n@limiter.limit(\"5/minute\")\ndef refresh_token(request: Request, payload: RefreshRequest, db: Session = Depends(get_db)) -> Token:\n    rt = db.query(RefreshToken).filter(RefreshToken.token == payload.refresh_token, RefreshToken.is_revoked == False).first()\n    if not rt or rt.expires_at < datetime.utcnow():\n        raise HTTPException(status_code=401, detail=\"Invalid or expired refresh token\")\n    \n    user = db.get(User, rt.user_id)\n    if not user:\n        raise HTTPException(status_code=401, detail=\"User not found\")\n        \n    new_access = create_access_token(subject=user.id, role=user.role)\n    new_refresh = secrets.token_urlsafe(32)\n    rt.is_revoked = True  # Rotate refresh token securely\n    \n    new_rt = RefreshToken(user_id=user.id, token=new_refresh, expires_at=datetime.utcnow() + timedelta(days=7))\n    db.add(new_rt)\n    db.commit()\n    \n    return Token(access_token=new_access, refresh_token=new_refresh, role=user.role)\n\n@router.get(\"/me\", response_model=UserRead)"
        )
    ]
    patch_file(auth_path, auth_replacements)

    # 6. Update app/api/common/realtime.py
    realtime_path = "app/api/common/realtime.py"
    realtime_replacements = [
        (
            "self._connections: DefaultDict[str, list[WebSocket]] = defaultdict(list)",
            "self._connections: DefaultDict[str, list[WebSocket]] = defaultdict(list)\n        self._rider_connections: DefaultDict[str, list[WebSocket]] = defaultdict(list)"
        ),
        (
            "async def connect(self, ride_id: str, websocket: WebSocket) -> None:\n        await websocket.accept()\n        self._connections[ride_id].append(websocket)",
            "async def connect(self, ride_id: str, websocket: WebSocket) -> None:\n        await websocket.accept()\n        self._connections[ride_id].append(websocket)\n\n    async def connect_rider(self, rider_id: str, websocket: WebSocket) -> None:\n        await websocket.accept()\n        self._rider_connections[rider_id].append(websocket)"
        ),
        (
            "def disconnect(self, ride_id: str, websocket: WebSocket) -> None:",
            "def disconnect_rider(self, rider_id: str, websocket: WebSocket) -> None:\n        if rider_id in self._rider_connections and websocket in self._rider_connections[rider_id]:\n            self._rider_connections[rider_id].remove(websocket)\n            if not self._rider_connections[rider_id]:\n                del self._rider_connections[rider_id]\n\n    def disconnect(self, ride_id: str, websocket: WebSocket) -> None:"
        ),
        (
            "        for ws in dead_sockets:\n            self.disconnect(ride_id, ws)",
            "        for ws in dead_sockets:\n            self.disconnect(ride_id, ws)\n\n    async def broadcast_to_rider(self, rider_id: str, payload: dict) -> None:\n        if rider_id not in self._rider_connections:\n            return\n        dead_sockets = []\n        for connection in self._rider_connections[rider_id]:\n            try:\n                await connection.send_json(payload)\n            except Exception:\n                dead_sockets.append(connection)\n        for ws in dead_sockets:\n            self.disconnect_rider(rider_id, ws)\n\n    async def broadcast_to_all_riders(self, payload: dict) -> None:\n        for rider_id in list(self._rider_connections.keys()):\n            await self.broadcast_to_rider(rider_id, payload)"
        )
    ]
    patch_file(realtime_path, realtime_replacements)

    # 7. Update app/main.py
    main_path = "app/main.py"
    main_replacements = [
        (
            "@app.websocket(\"/ws/rides/{ride_id}\")",
            "@app.websocket(\"/ws/rider/{rider_id}\")\nasync def websocket_rider_endpoint(websocket: WebSocket, rider_id: str):\n    await realtime_manager.connect_rider(rider_id, websocket)\n    try:\n        while True:\n            data = await websocket.receive_text()\n            await websocket.send_text(f\"Rider Echo: {data}\")\n    except WebSocketDisconnect:\n        realtime_manager.disconnect_rider(rider_id, websocket)\n\n@app.websocket(\"/ws/rides/{ride_id}\")"
        )
    ]
    patch_file(main_path, main_replacements)

    # 8. Update app/api/user/rides.py
    rides_path = "app/api/user/rides.py"
    rides_replacements = [
        (
            "async def create_ride(\n    payload: RideCreate,\n    current_user: User = Depends(get_current_user),",
            "from app.api.common.deps import require_role\n\nasync def create_ride(\n    payload: RideCreate,\n    current_user: User = Depends(require_role([\"customer\", \"admin\"])),"
        ),
        (
            "    await realtime_manager.broadcast(ride.id, {\"event\": \"ride_created\", \"ride\": RideRead.model_validate(ride).model_dump(mode=\"json\")})\n    return ride",
            "    # Broadcast to generic ride channel\n    await realtime_manager.broadcast(ride.id, {\"event\": \"ride_created\", \"ride\": RideRead.model_validate(ride).model_dump(mode=\"json\")})\n    # Also broadcast live to all connected riders so they see incoming requests instantly\n    await realtime_manager.broadcast_to_all_riders({\"event\": \"new_ride_request\", \"ride\": RideRead.model_validate(ride).model_dump(mode=\"json\")})\n    \n    return ride"
        )
    ]
    patch_file(rides_path, rides_replacements)

if __name__ == "__main__":
    main()
