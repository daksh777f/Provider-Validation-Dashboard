"""
Verification SMS service.
Handles sending verification messages and processing responses.
"""

import os
import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from ..models import VerificationSession, VerificationStatus, VerificationRequest
from . import verification_store


def _ensure_session_model(session_obj):
    """Ensure we have a VerificationSession model instance (convert dict -> model)."""
    if session_obj is None:
        return None
    if isinstance(session_obj, VerificationSession):
        return session_obj
    if isinstance(session_obj, dict):
        try:
            return VerificationSession(**session_obj)
        except Exception:
            return None
    return None


def format_verification_sms(provider_name: str, data: Dict[str, Any]) -> str:
    """Format the initial verification SMS message.
    Smart mode: Only asks about fields with issues/mismatches.
    """
