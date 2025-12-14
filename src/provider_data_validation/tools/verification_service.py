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
    # Extract issues/mismatches if available
    issues = data.get('issues', [])
    discrepancies = data.get('discrepancies', {})
    
    # If there are specific issues, ask only about those
    if issues or discrepancies:
        message_parts = [f"Hi {provider_name},", ""]
        
        # Check discrepancies (SKIP: phone=delivery proves it, specialty=doesn't change)
        if discrepancies:
            if 'address' in discrepancies:
                old = discrepancies['address'].get('old_value', '')
                new = discrepancies['address'].get('new_value', '')
                message_parts.append(f"Address mismatch:")
                message_parts.append(f"A: {old}")
                message_parts.append(f"B: {new}")
                message_parts.append(f"Reply A or B.")
                return "\n".join(message_parts)
        
        # Ask about mutable fields only (address, hospital, etc.)
        if issues:
            # Filter to only ask about changeable information
            changeable_issues = [i for i in issues if 'specialty' not in i.lower() and 'phone' not in i.lower()]
            if changeable_issues:
                issue_text = changeable_issues[0] if isinstance(changeable_issues, list) else str(changeable_issues)
                message_parts.append(f"Issue: {issue_text[:50]}")
                message_parts.append("")
                message_parts.append("Reply YES if all correct or NO to update.")
                return "\n".join(message_parts)
    
    # Fallback: Ask about key fields only
