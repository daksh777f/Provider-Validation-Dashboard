from crewai import Agent, Crew, Process, Task, LLM
from crewai.project import CrewBase, agent, crew, task
from crewai.tools import BaseTool
import json
import os
from datetime import datetime
from typing import Optional, Dict, List, Any

# Paths - relative to project root
# Go up 5 levels: drift_monitoring_crew.py -> drift_monitoring_crew/ -> crews/ -> provider_data_validation/ -> src/ -> project_root/
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
MOCK_DATA_DIR = os.path.join(BASE_DIR, "mock_data")

HISTORICAL_DATA_DIR = os.path.join(MOCK_DATA_DIR, "historical")
LICENSE_PATH = os.path.join(MOCK_DATA_DIR, "license_registry.json")
HOSPITAL_PATH = os.path.join(MOCK_DATA_DIR, "hospital_roster.json")
NPI_PATH = os.path.join(MOCK_DATA_DIR, "npi_registry.json")
MAPS_PATH = os.path.join(MOCK_DATA_DIR, "maps_listing.json")


# Helper function to load historical data
def load_historical_data(provider_name: str) -> Optional[Dict[str, Any]]:
    """
    Load historical provider data from snapshot files.
    
    Args:
        provider_name: Name of the provider to search for
        
    Returns:
        Historical provider data dict or None if not found
    """
    # Find the most recent snapshot
    snapshot_files = []
    if os.path.exists(HISTORICAL_DATA_DIR):
        for filename in os.listdir(HISTORICAL_DATA_DIR):
            if filename.endswith('.json'):
                snapshot_files.append(os.path.join(HISTORICAL_DATA_DIR, filename))
    
    if not snapshot_files:
        return None
    
    # Use the most recent snapshot (by filename)
    snapshot_files.sort(reverse=True)
    latest_snapshot = snapshot_files[0]
    
    try:
        with open(latest_snapshot, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Find the provider in the snapshot
        for provider in data.get('providers', []):
            if provider.get('name', '').lower() == provider_name.lower():
                return provider
    except Exception as e:
        print(f"Error loading historical data: {e}")
    
    return None


# Helper function to load current provider data
def load_current_data(provider_name: str) -> Dict[str, Any]:
    """
    Load current provider data from all registries.
    
    Args:
        provider_name: Name of the provider to search for
        
    Returns:
        Dict with current data from all sources
    """
    current_data = {
        "license": {},
        "hospital": {},
        "npi": {},
        "maps": {}
    }
    
    # Load from license registry
    if os.path.exists(LICENSE_PATH):
        with open(LICENSE_PATH, 'r', encoding='utf-8') as f:
            license_data = json.load(f)
        for record in license_data.get('licenses', []):
            if record.get('doctor_name', '').lower() == provider_name.lower():
                current_data['license'] = record
                break
    
    # Load from hospital roster
    if os.path.exists(HOSPITAL_PATH):
        with open(HOSPITAL_PATH, 'r', encoding='utf-8') as f:
            hospital_data = json.load(f)
        for hospital in hospital_data.get('hospitals', []):
            for doctor in hospital.get('doctors', []):
                if doctor.get('name', '').lower() == provider_name.lower():
                    current_data['hospital'] = {
                        **doctor,
                        'hospital_name': hospital.get('hospital_name'),
                        'location': hospital.get('location')
                    }
                    break
    
    # Load from NPI registry
    if os.path.exists(NPI_PATH):
        with open(NPI_PATH, 'r', encoding='utf-8') as f:
            npi_data = json.load(f)
        for record in npi_data.get('providers', []):
            if record.get('name', '').lower() == provider_name.lower():
                current_data['npi'] = record
                break
    
    # Load from maps listing
    if os.path.exists(MAPS_PATH):
        with open(MAPS_PATH, 'r', encoding='utf-8') as f:
            maps_data = json.load(f)
        for record in maps_data.get('clinics', []):
            for doc in record.get('doctors', []):
                if doc.get('name', '').lower() == provider_name.lower():
                    current_data['maps'] = {
                        **doc,
                        'clinic_name': record.get('clinic_name'),
                        'clinic_address': record.get('address')
