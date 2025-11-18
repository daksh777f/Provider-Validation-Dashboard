"""
Validation Service - Orchestrates provider validation across multiple crews and data sources.
Provides a unified interface for API layer to interact with validation logic.
"""

import json
import os
import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime
from pathlib import Path
import uuid
import time

from .config import settings
from .logger import logger
from .compliance.compliance_engine import calculate_cri, get_provider_compliance

_redis_client = None
if settings.REDIS_URL:
    try:
        import redis

        _redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        logger.info("ValidationService: connected to Redis")
    except Exception as e:
        logger.warning(f"ValidationService: could not connect to Redis: {e}")

from .models import (
    ProviderInput, ValidationResult, ConfidenceScores, 
    LicenseInfo, HospitalAffiliation, RiskFlag, ValidationIssue,
    BatchValidationResponse
)


