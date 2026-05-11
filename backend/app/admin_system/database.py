import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base

# Environment-based database switching
# Uses PostgreSQL if ADMIN_DATABASE_URL is provided, else falls back to local async SQLite
DATABASE_URL = os.getenv("ADMIN_DATABASE_URL", "sqlite+aiosqlite:///./admin_system.db")

# Create Async Engine
engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    # Postgres specific pool configurations can be added here if needed based on the URL prefix
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

# Separate Declarative Base for Admin Module to avoid interfering with the main app
AdminBase = declarative_base()

async def get_admin_db():
    """Dependency to provide a transactional async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
