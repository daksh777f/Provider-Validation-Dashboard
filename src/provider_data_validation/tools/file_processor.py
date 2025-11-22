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
            return True
    
    @staticmethod
    def _extract_with_ocr(file_content: bytes) -> str:
        """Extract text using vision LLM (preferred) or Tesseract OCR."""
        try:
            from pdf2image import convert_from_bytes
            
            print("📷 Converting PDF to images for OCR...")
            images = convert_from_bytes(file_content, dpi=300)
            full_text = ""
            
            # Try vision LLM first
            try:
                from .ocr_agent import extract_text_with_vision_llm, is_ollama_available
                
                if is_ollama_available():
                    print("🤖 Using LLaVA vision model...")
                    for i, image in enumerate(images):
                        print(f"  Page {i+1}/{len(images)}...")
                        text = extract_text_with_vision_llm(image)
                        full_text += text + "\n\n"
                    print(f"✓ Vision LLM complete ({len(full_text)} chars)")
                    return full_text
                else:
                    print("⚠️ LLaVA not available, using Tesseract...")
            except:
                print("⚠️ Vision LLM failed, using Tesseract...")
            
            # Fallback to Tesseract
            import pytesseract
            import platform
            if platform.system() == "Windows":
                paths = [r'C:\Program Files\Tesseract-OCR\tesseract.exe',
                        r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe']
                for path in paths:
                    if Path(path).exists():
                        pytesseract.pytesseract.tesseract_cmd = path
                        break
            
            for i, image in enumerate(images):
                print(f"  Page {i+1}/{len(images)}...")
                text = pytesseract.image_to_string(image, lang='eng')
                full_text += text + "\n\n"
