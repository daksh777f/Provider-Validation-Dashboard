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
                # Attempt to reconstruct BatchValidationResponse
                try:
                    return BatchValidationResponse(**data)
                except Exception:
                    return None
            return cls.batch_jobs.get(batch_id)
        except Exception as e:
            logger.warning(f"Failed to load batch {batch_id}: {e}")
            return None
    
    @staticmethod
    def _normalize_name(name: str) -> str:
        """Normalize provider name for matching."""
        return name.lower().strip()
    
    @staticmethod
    def _load_json(path: Path) -> Dict[str, Any]:
        """Load JSON file with error handling."""
        try:
            if path.exists():
                with open(path, 'r') as f:
                    return json.load(f)
        except Exception as e:
            print(f"Error loading {path}: {e}")
        return {}
    
    @staticmethod
    def _load_html(path: Path) -> str:
        """Load HTML file with error handling."""
        try:
            if path.exists():
                with open(path, 'r') as f:
                    return f.read()
        except Exception as e:
            print(f"Error loading {path}: {e}")
        return ""
    
    @classmethod
    def _search_npi_registry(cls, provider_name: str, phone: Optional[str] = None) -> Optional[Dict]:
        """Search NPI registry for provider."""
        npi_data = cls._load_json(cls.NPI_PATH)
        normalized_name = cls._normalize_name(provider_name)
        
        for entry in npi_data.get("providers", []):
            if cls._normalize_name(entry.get("name", "")) == normalized_name:
                if phone:
                    # If phone provided, verify it matches
                    entry_phone = entry.get("phone", "").replace(" ", "").replace("-", "")
                    input_phone = phone.replace(" ", "").replace("-", "")
                    if entry_phone == input_phone:
                        return entry
                else:
                    return entry
        return None
    
    @classmethod
    def _search_license_registry(cls, provider_name: str, license_no: Optional[str] = None) -> Optional[Dict]:
        """Search license registry for provider."""
        license_data = cls._load_json(cls.LICENSE_PATH)
        normalized_name = cls._normalize_name(provider_name)
        
        for entry in license_data.get("licenses", []):
            if cls._normalize_name(entry.get("name", "")) == normalized_name:
                if license_no:
                    if entry.get("license_number", "") == license_no:
                        return entry
                else:
                    return entry
        return None
    
    @classmethod
    def _search_hospital_roster(cls, provider_name: str) -> Optional[Dict]:
        """Search hospital roster for provider."""
        hospital_data = cls._load_json(cls.HOSPITAL_PATH)
        normalized_name = cls._normalize_name(provider_name)
        
        for entry in hospital_data.get("roster", []):
            if cls._normalize_name(entry.get("name", "")) == normalized_name:
                return entry
        return None
    
    @classmethod
    def _search_maps_listing(cls, provider_name: str) -> Optional[Dict]:
        """Search maps listing for provider."""
        maps_data = cls._load_json(cls.MAPS_PATH)
        normalized_name = cls._normalize_name(provider_name)
        
        for entry in maps_data.get("businesses", []):
            if cls._normalize_name(entry.get("name", "")) == normalized_name:
                return entry
        return None
    
    @classmethod
    def _extract_from_clinic_website(cls, provider_name: str) -> Optional[Dict]:
        """Extract provider info from clinic website HTML."""
        html_content = cls._load_html(cls.CLINIC_PATH)
        
        if not html_content:
            return None
        
        # Simple HTML parsing for clinic info
        try:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(html_content, 'html.parser')
            
