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


def _to_dict(session) -> dict:
    if isinstance(session, VerificationSession):
        try:
            return session.model_dump()
        except Exception:
            # Fallback for pydantic v1 projects
            return session.dict()
    elif isinstance(session, dict):
        return session
    else:
        return {}


def create_session(session: VerificationSession) -> None:
    data = _to_dict(session)

    if redis_client:
        key = f"verification:session:{data['session_id']}"
        redis_client.set(key, json.dumps(data, default=str))
        # index by phone
        phone = data.get("phone")
        if phone:
            redis_client.set(f"verification:phone:{phone}", data["session_id"])
        return

    if db_available:
        db = SessionLocal()
        try:
            obj = db.query(VerificationSessionDB).filter_by(session_key=data["session_id"]).one_or_none()
            if obj is None:
                obj = VerificationSessionDB(
                    provider_id=data.get("provider_id"),
                    session_key=data["session_id"],
                    data=data,
                )
                db.add(obj)
            else:
                obj.data = data
                obj.provider_id = data.get("provider_id")
            db.commit()
        except Exception:
            db.rollback()
        finally:
            db.close()
        return
