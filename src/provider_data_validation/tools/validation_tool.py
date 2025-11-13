import json
import os
from crewai.tools import BaseTool
from pydantic import BaseModel
from bs4 import BeautifulSoup


MOCK_DIR = "mock_data"   # root folder for all mock files


# --------------------------------------------------
# 1️⃣ LOAD NPI / DOCTOR REGISTRY TOOL
# --------------------------------------------------

class LoadNPIRegistryTool(BaseTool):
    name: str = "load_npi_registry"
    description: str = "Load mock NPI/doctor registry data from JSON."

    def _run(self) -> dict:
        path = os.path.join(MOCK_DIR, "npi_registry.json")
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)


# --------------------------------------------------
# 2️⃣ LOAD LICENSE REGISTRY TOOL
# --------------------------------------------------

class LoadLicenseRegistryTool(BaseTool):
    name: str = "load_license_registry"
    description: str = "Load mock medical license registry from JSON."

    def _run(self) -> dict:
        path = os.path.join(MOCK_DIR, "license_registry.json")
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)


# --------------------------------------------------
# 3️⃣ LOAD HOSPITAL ROSTER TOOL
# --------------------------------------------------

class LoadHospitalRosterTool(BaseTool):
    name: str = "load_hospital_roster"
    description: str = "Load mock hospital roster data from JSON."

    def _run(self) -> dict:
        path = os.path.join(MOCK_DIR, "hospital_roster.json")
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
