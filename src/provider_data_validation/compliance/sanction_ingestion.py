import asyncio
import httpx
from datetime import datetime
from typing import List, Dict, Any
from ..compliance_store import upsert_sanction


OIG_EXCLUSIONS_URL = "https://oig.hhs.gov/exclusions/downloadables/UPDATED.csv"
SAM_API_KEY = None  # Set to enable SAM.gov API access


async def ingest_sanctions() -> Dict[str, Any]:
    """
    Download and store sanctions from OIG and SAM.gov.
    Returns summary statistics.
    """
    oig_count = await _ingest_oig()
    sam_count = await _ingest_sam()
    
    return {
        "ingestion_time": datetime.utcnow().isoformat(),
        "oig_records": oig_count,
        "sam_records": sam_count,
        "total": oig_count + sam_count
    }


async def _ingest_oig() -> int:
    """Download OIG-LEIE exclusion list and store."""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.get(OIG_EXCLUSIONS_URL)
            resp.raise_for_status()
            lines = resp.text.strip().split("\n")
            headers = lines[0].lower().split(",")
