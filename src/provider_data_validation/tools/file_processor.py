"""
File processing utilities for extracting provider data from PDF and Excel files.
Supports extraction of provider names and related information.
"""

import io
from typing import List, Dict, Any, Optional
from pathlib import Path

try:
    import pypdf
except ImportError:
    pypdf = None

try:
    import openpyxl
except ImportError:
    openpyxl = None


class FileProcessor:
    """Processes PDF and Excel files to extract provider information."""
    
    COMMON_HEADERS = [
        "name", "provider", "provider_name", "doctor", "physician",
        "full_name", "last_name", "first_name",
        "phone", "contact", "phone_number", "contact_number",
        "address", "location", "clinic", "facility",
        "license", "license_no", "license_number", "npi", "npi_number",
        "specialty", "specialization", "credentials",
        "hospital", "affiliation", "department"
    ]
    
    @staticmethod
    def _is_scanned_pdf(reader) -> bool:
        """Check if PDF is scanned/image-based (minimal extractable text)."""
        try:
            total_text = ""
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    total_text += text
            return len(total_text.strip()) < 50
        except:
