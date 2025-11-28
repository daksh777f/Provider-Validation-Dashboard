from crewai import Agent, Crew, Process, Task, LLM
from crewai.project import CrewBase, agent, crew, task
from crewai.tools import BaseTool
import json
import os
import bs4

# Mock data paths - relative to project root
# Go up 5 levels: data_validation_crew.py -> data_validation_crew/ -> crews/ -> provider_data_validation/ -> src/ -> project_root/
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
MOCK_DATA_DIR = os.path.join(BASE_DIR, "mock_data")

NPI_PATH = os.path.join(MOCK_DATA_DIR, "npi_registry.json")
LICENSE_PATH = os.path.join(MOCK_DATA_DIR, "license_registry.json")
HOSPITAL_PATH = os.path.join(MOCK_DATA_DIR, "hospital_roster.json")
MAPS_PATH = os.path.join(MOCK_DATA_DIR, "maps_listing.json")
CLINIC_PATH = os.path.join(MOCK_DATA_DIR, "clinic_website.html")

# Helper function to validate extracted data and compute confidence scores
def validate_provider_data(extracted_data: dict) -> dict:
    """Compute confidence scores based on extracted data."""
    npi = extracted_data.get("npi", {})
    license_data = extracted_data.get("license", {})
    hospital = extracted_data.get("hospital", {})
    maps = extracted_data.get("maps", {})
    clinic = extracted_data.get("clinic", {})
    
    # Count how many sources have data
    sources_found = sum([bool(npi), bool(license_data), bool(hospital), bool(maps), bool(clinic)])
    matched_sources = []
    if npi: matched_sources.append("npi")
    if license_data: matched_sources.append("license")
    if hospital: matched_sources.append("hospital")
    if maps: matched_sources.append("maps")
    if clinic: matched_sources.append("clinic")
    
    # NEW: Compare data across sources for quality score
    data_consistency_score = 1.0
    discrepancies = []
    
    # Check phone consistency across sources
    phones = []
    if npi and npi.get("phone"): phones.append(("npi", npi["phone"].replace(" ", "").replace("-", "")))
    if maps and maps.get("phone"): phones.append(("maps", maps["phone"].replace(" ", "").replace("-", "")))
    if clinic and clinic.get("phone"): phones.append(("clinic", clinic["phone"].replace(" ", "").replace("-", "")))
    
    if len(phones) > 1:
        unique_phones = set(p[1] for p in phones)
        if len(unique_phones) > 1:
            data_consistency_score -= 0.2
            discrepancies.append(f"Phone mismatch: {phones}")
    
    # Check specialty consistency
    specialties = []
    if npi and npi.get("specialty"): specialties.append(("npi", npi["specialty"].lower()))
    if license_data and license_data.get("specialty"): specialties.append(("license", license_data["specialty"].lower()))
    if clinic and clinic.get("specialty"): specialties.append(("clinic", clinic["specialty"].lower()))
    
    if len(specialties) > 1:
        unique_specialties = set(s[1] for s in specialties)
        if len(unique_specialties) > 1:
            data_consistency_score -= 0.25
            discrepancies.append(f"Specialty mismatch: {specialties}")
    
    # Check address/location consistency
    locations = []
    if npi and npi.get("address"): locations.append(("npi", npi["address"].lower()))
    if maps and maps.get("address"): locations.append(("maps", maps["address"].lower()))
    if clinic and clinic.get("address"): locations.append(("clinic", clinic["address"].lower()))
    
    if len(locations) > 1:
        # Check if addresses share common parts (city/state)
        all_same = all(locations[0][1] in loc[1] or loc[1] in locations[0][1] for loc in locations)
        if not all_same:
            data_consistency_score -= 0.15
            discrepancies.append(f"Location mismatch")
    
    # Final match score combines source coverage AND data quality
    source_coverage = sources_found / 5.0
    match_score = source_coverage * max(data_consistency_score, 0.3)  # Min 30% even with issues
    
    # License confidence
    license_confidence = 1.0 if license_data and license_data.get("status") == "Active" else 0.5 if license_data else 0.0
    
