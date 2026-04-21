from functools import lru_cache
from pymongo import MongoClient
from pymongo.database import Database

from app.core.config import settings


@lru_cache(maxsize=1)
def _mongo_client() -> MongoClient:
    return MongoClient(settings.mongo_url, serverSelectionTimeoutMS=3000)


def get_mongo_db() -> Database:
    client = _mongo_client()
    return client[settings.mongo_db_name]
