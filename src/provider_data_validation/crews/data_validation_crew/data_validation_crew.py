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
