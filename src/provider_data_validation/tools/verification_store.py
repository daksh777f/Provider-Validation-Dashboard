"""Verification session storage.

This module prefers Redis for production persistence when `REDIS_URL` is
configured. When Redis is absent the module will try a SQL (Postgres)
fallback when `DATABASE_URL` is configured. Finally an in-memory dictionary
is used for development / demo environments.
"""

import json
from typing import Dict, Optional
from ..models import VerificationSession
from ..config import settings
from ..logger import logger


redis_client = None
if settings.REDIS_URL:
    try:
        import redis

        redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        logger.info("Verification store: connected to Redis")
    except Exception as e:
        logger.warning(f"Could not connect to Redis at {settings.REDIS_URL}: {e}")


# Optional SQL fallback
db_available = False
try:
    if settings.database_url:
        from ..db import SessionLocal, VerificationSessionDB, init_db

        try:
            init_db()
        except Exception:
            pass

        db_available = True
        logger.info("Verification store: SQL fallback available")
except Exception:
    db_available = False


# In-memory fallback storage
_sessions: Dict[str, dict] = {}

