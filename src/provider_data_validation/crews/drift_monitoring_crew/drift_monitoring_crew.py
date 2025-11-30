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
