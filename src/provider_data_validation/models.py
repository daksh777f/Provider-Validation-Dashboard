"""
Pydantic models for Provider Data Validation System.
Defines request/response schemas for API endpoints.
"""

from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime


class ConfidenceScores(BaseModel):
    """Confidence scores for different validation aspects."""
    identity_match: float = Field(..., ge=0, le=1, description="Identity match confidence (0-1)")
    license_validity: float = Field(..., ge=0, le=1, description="License validity confidence (0-1)")
    contact_info_accuracy: float = Field(..., ge=0, le=1, description="Contact info accuracy confidence (0-1)")
    hospital_affiliation: float = Field(..., ge=0, le=1, description="Hospital affiliation confidence (0-1)")
    specialty_verification: float = Field(..., ge=0, le=1, description="Specialty verification confidence (0-1)")
    data_freshness: float = Field(..., ge=0, le=1, description="Data freshness confidence (0-1)")
    overall_confidence: float = Field(..., ge=0, le=1, description="Overall validation confidence (0-1)")


class LicenseInfo(BaseModel):
    """License information."""
    license_number: Optional[str] = None
    status: Optional[str] = None
    specialty: Optional[str] = None
    expiration_date: Optional[str] = None
    issuing_body: Optional[str] = None


class HospitalAffiliation(BaseModel):
    """Hospital affiliation details."""
    hospital_name: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    affiliation_status: Optional[str] = None


class RiskFlag(BaseModel):
    """Risk flag with severity level."""
