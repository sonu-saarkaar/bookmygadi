from typing import TypeVar, Generic, Type, Any, Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from .models import AdminBase

ModelType = TypeVar("ModelType", bound=AdminBase)

class BaseRepository(Generic[ModelType]):
    def __init__(self, model: Type[ModelType]):
        self.model = model

    async def get(self, db: AsyncSession, id: Any) -> Optional[ModelType]:
        stmt = select(self.model).filter(self.model.id == id, getattr(self.model, 'is_deleted', False) == False)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_all(self, db: AsyncSession, skip: int = 0, limit: int = 100) -> List[ModelType]:
        stmt = select(self.model).filter(getattr(self.model, 'is_deleted', False) == False).offset(skip).limit(limit)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def create(self, db: AsyncSession, obj_in: dict) -> ModelType:
        db_obj = self.model(**obj_in)
        db.add(db_obj)
        await db.flush()
        return db_obj

    async def update(self, db: AsyncSession, db_obj: ModelType, obj_in: dict) -> ModelType:
        for field, value in obj_in.items():
            setattr(db_obj, field, value)
        await db.flush()
        return db_obj

    async def soft_delete(self, db: AsyncSession, id: Any) -> bool:
        stmt = update(self.model).where(self.model.id == id).values(is_deleted=True)
        result = await db.execute(stmt)
        return result.rowcount > 0

class DriverRepository(BaseRepository):
    async def get_by_dl(self, db: AsyncSession, dl: str):
        stmt = select(self.model).filter(self.model.driving_license_number == dl, self.model.is_deleted == False)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_aadhaar(self, db: AsyncSession, aadhaar: str):
        stmt = select(self.model).filter(self.model.aadhaar_number == aadhaar, self.model.is_deleted == False)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
