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


class ValidationService:
    """Service to orchestrate provider validation."""
    
    # Paths to mock data
    BASE_PATH = Path(__file__).parent.parent.parent
    NPI_PATH = BASE_PATH / "mock_data" / "npi_registry.json"
    LICENSE_PATH = BASE_PATH / "mock_data" / "license_registry.json"
    HOSPITAL_PATH = BASE_PATH / "mock_data" / "hospital_roster.json"
    MAPS_PATH = BASE_PATH / "mock_data" / "maps_listing.json"
    CLINIC_PATH = BASE_PATH / "mock_data" / "clinic_website.html"
    
    # Storage for batch jobs
    batch_jobs: Dict[str, BatchValidationResponse] = {}

    @classmethod
    def _store_batch(cls, batch_id: str, batch_response: BatchValidationResponse) -> None:
        """Persist batch response to Redis if available, otherwise keep in-memory."""
        try:
            data = batch_response.model_dump() if hasattr(batch_response, 'model_dump') else batch_response.__dict__
            if _redis_client:
                _redis_client.set(f"batch:{batch_id}", json.dumps(data, default=str))
            else:
                cls.batch_jobs[batch_id] = batch_response
        except Exception as e:
            logger.warning(f"Failed to persist batch {batch_id}: {e}")

    @classmethod
    def _load_batch(cls, batch_id: str) -> Optional[BatchValidationResponse]:
        """Load batch response from Redis or in-memory store."""
        try:
            if _redis_client:
                raw = _redis_client.get(f"batch:{batch_id}")
                if not raw:
                    return None
                data = json.loads(raw)
