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
            
            print(f"✓ OCR complete ({len(full_text)} chars)")
            return full_text
        except ImportError:
            raise ImportError(
                "OCR libraries not installed.\n"
                "Run: pip install pytesseract pdf2image Pillow\n"
                "Install Tesseract: https://github.com/UB-Mannheim/tesseract/wiki"
            )
        except Exception as e:
            raise ValueError(f"OCR failed: {str(e)}")
    
    @staticmethod
    def extract_from_pdf(file_content: bytes) -> List[Dict[str, Any]]:
        """
        Extract provider data from PDF file.
        Returns list of provider dictionaries.
        """
        if not pypdf:
            raise ImportError("pypdf is not installed. Install it with: pip install pypdf")
        
        providers = []
        
        try:
            pdf_file = io.BytesIO(file_content)
            reader = pypdf.PdfReader(pdf_file)
            
            # Check if PDF is scanned/image-based
            is_scanned = FileProcessor._is_scanned_pdf(reader)
            
            if is_scanned:
                print("📷 Scanned/handwritten PDF detected. Using OCR...")
                full_text = FileProcessor._extract_with_ocr(file_content)
            else:
                print("📄 Text-based PDF. Using standard extraction...")
                full_text = ""
                for page in reader.pages:
                    full_text += page.extract_text() + "\n"
            
            # Parse text to find provider entries
            print(f"\n{'='*60}")
            print(f"EXTRACTED PDF TEXT ({len(full_text)} chars):")
            print(f"{'='*60}")
            print(full_text[:500] if len(full_text) > 500 else full_text)  # First 500 chars
