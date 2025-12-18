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
            
            # Look for provider sections
            normalized_name = cls._normalize_name(provider_name)
            
            # Extract clinic data (this is simplified - adapt based on actual HTML structure)
            clinic_info = {
                "name": provider_name,
                "phone": None,
                "address": None,
                "specialty": None
            }
            
            # Parse based on HTML structure
            for div in soup.find_all('div', class_='provider'):
                if normalized_name in cls._normalize_name(div.get_text()):
                    # Extract phone, address, specialty
                    phone_elem = div.find('span', class_='phone')
                    if phone_elem:
                        clinic_info["phone"] = phone_elem.get_text().strip()
                    
                    address_elem = div.find('span', class_='address')
                    if address_elem:
                        clinic_info["address"] = address_elem.get_text().strip()
                    
                    specialty_elem = div.find('span', class_='specialty')
                    if specialty_elem:
                        clinic_info["specialty"] = specialty_elem.get_text().strip()
                    
                    return clinic_info if any(clinic_info.values()) else None
        except Exception as e:
            print(f"Error parsing clinic website: {e}")
        
        return None
    
    @classmethod
    def validate_provider(cls, provider: ProviderInput) -> ValidationResult:
        """
        Validate a single provider against all data sources using DataValidationCrew with Ollama.
        Returns comprehensive validation result with confidence scores.
        """
        start_time = time.time()
        provider_id = str(uuid.uuid4())
        
        # ============================================================
        # HYBRID APPROACH: Try Ollama crew first, fallback to helpers
        # ============================================================
        crew_failed = False
        
        # Run DataValidationCrew with Ollama
        try:
            if not settings.ENABLE_LLM:
                print("⚠️ LLM features disabled. Skipping crew execution...")
                crew_failed = True
            else:
                from .crews.data_validation_crew.data_validation_crew import DataValidationCrew
                
                print(f"\n🤖 Attempting validation with Ollama crew...")
                
                # Create and run the crew with Ollama agents
                crew = DataValidationCrew()
                result = crew.crew().kickoff(inputs={"provider_name": provider.provider_name})
                
                # Parse the crew output
                import json
                import re
                
                # Extract JSON from crew result
                result_str = str(result.raw) if hasattr(result, 'raw') else str(result)
                result_str = re.sub(r'```json\s*|\s*```', '', result_str).strip()
                
                # Check if result is empty
                if not result_str:
                    print("⚠️ Crew returned empty result, falling back to helpers...")
                    crew_failed = True
                else:
                    # Parse the validation data
                    validation_result = json.loads(result_str)
                    
                    # Check if crew found any sources
                    matched_sources = validation_result.get("identity", {}).get("matched_sources", [])
                    if not matched_sources:
                        print(f"⚠️ Crew found 0 sources for {provider.provider_name}, falling back to helpers...")
                        crew_failed = True
                    else:
                        print(f"✅ Crew found {len(matched_sources)} sources: {matched_sources}")
        except Exception as e:
            print(f"⚠️ Crew execution failed: {e}")
            print("   Falling back to helper functions...")
            crew_failed = True
        
        # FALLBACK: Use helper functions (ALWAYS USED NOW)
        if crew_failed:
            from .crews.data_validation_crew.data_validation_crew import extract_provider_data, validate_provider_data
            
            print(f"🔧 Using helper functions for {provider.provider_name}...")
            extracted_data = extract_provider_data(provider.provider_name)
            validation_result = validate_provider_data(extracted_data)
            print(f"✅ Helper functions completed")
        
        # The crew output or helper output is now in validation_result
        # Extract information from validation_result
        license_data = validation_result.get("license", {})
        affiliation_data = validation_result.get("affiliation", {})
        location_data = validation_result.get("location", {})
        specialty_data = validation_result.get("specialty", {})
        
