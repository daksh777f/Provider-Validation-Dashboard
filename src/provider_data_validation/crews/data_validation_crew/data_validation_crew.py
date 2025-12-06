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
    
    # Location confidence (verify phone and address consistency)
    location_confidence = 0.0
    input_phone = ""
    verified_phone = ""
    input_address = ""
    verified_address = ""
    needs_location_verification = False
    
    if npi:
        input_phone = npi.get("phone", "")
        input_address = npi.get("address", "")
    if clinic:
        verified_phone = clinic.get("phone", "")
        verified_address = clinic.get("address", "")
    
    if input_phone and verified_phone:
        # Normalize phone for comparison
        phone_match = input_phone.replace(" ", "") == verified_phone.replace(" ", "")
        location_confidence += 0.5 if phone_match else 0.25
    if input_address and verified_address:
        address_match = input_address.lower() in verified_address.lower() or verified_address.lower() in input_address.lower()
        location_confidence += 0.5 if address_match else 0.25
    
    if location_confidence < 0.5:
        needs_location_verification = True
    
    # Affiliation confidence
    affiliation_confidence = 0.0
    hospital_name = ""
    department = ""
    if hospital:
        hospital_name = hospital.get("hospital_name", "")
        department = hospital.get("department", "")
        affiliation_confidence = 1.0
    
    # Specialty confidence
    specialty_confidence = 0.0
    input_specialty = ""
    verified_specialty = ""
    if npi:
        input_specialty = npi.get("specialty", "")
    if clinic:
        verified_specialty = clinic.get("specialty", "")
    
    if input_specialty and verified_specialty:
        specialty_match = input_specialty.lower() == verified_specialty.lower()
        specialty_confidence = 1.0 if specialty_match else 0.7
    elif input_specialty or verified_specialty:
        specialty_confidence = 0.5
    
    
    # ==================================================================
    # HYBRID VALIDATION SCORING SYSTEM
    # Combines rule-based deterministic checks with penalty-based scoring
    # Creates realistic confidence variance (60%-95%) based on actual issues
    # ==================================================================
    
    # Base weights for each dimension
    WEIGHTS = {
        'identity_match': 0.25,      # How many sources found
        'license': 0.20,             # License validity
        'location': 0.20,            # Phone/address accuracy
        'specialty': 0.15,           # Specialty verification
        'affiliation': 0.10,         # Hospital affiliation
        'consistency': 0.10          # Cross-source data consistency
    }
    
    # Calculate weighted components
    components = {
        'identity_match': match_score,
        'license': license_confidence,
        'location': location_confidence,
        'specialty': specialty_confidence,
        'affiliation': affiliation_confidence,
        'consistency': max(data_consistency_score, 0.0)
    }
    
    # Weighted average
    overall_base = sum(components[k] * WEIGHTS[k] for k in WEIGHTS.keys())
    
    # Apply penalties for critical issues
    penalties = 0.0
    issues = []
    
    # Penalty for low source coverage
    if sources_found < 3:
        penalty = (3 - sources_found) * 0.05  # -5% per missing source
        penalties += penalty
        issues.append(f"Limited data sources ({sources_found}/5)")
    
    # Penalty for data inconsistencies
    if discrepancies:
        penalty = len(discrepancies) * 0.08  # -8% per discrepancy
        penalties += penalty
        for disc in discrepancies:
            issues.append(disc)
    
    # Penalty for inactive/missing license
    if not license_data or license_data.get("status") != "Active":
        penalties += 0.10
        issues.append("License not active or not found")
    
    # Penalty for location verification needed
    if needs_location_verification:
        penalties += 0.07
        issues.append("Location verification required")
    
    # Final confidence with penalties applied
    overall_validation_confidence = max(overall_base - penalties, 0.35)  # Floor at 35%
    

    
    # Round to percentage (e.g., 0.89 = 89%)
    overall_validation_confidence = round(overall_validation_confidence, 2)
    
    
    # Determine if contact verification is needed
    requires_contact_verification = sources_found < 3 or location_confidence < 0.7
    
    # Merge additional issues with those from hybrid scoring
    if not license_data:
        issues.append("No license data found")
    elif license_data.get("status") != "Active":
        issues.append(f"License status is {license_data.get('status')}")
    if not hospital:
        issues.append("No hospital affiliation found")
