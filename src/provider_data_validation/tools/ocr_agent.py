"""
OCR Agent - Uses Ollama LLaVA vision model to extract text from images.
Specifically designed to read handwritten provider names from PDF images.
"""

import base64
from io import BytesIO
from typing import Optional
import requests
from PIL import Image


def extract_text_with_vision_llm(image: Image.Image) -> str:
    """
    Use Ollama LLaVA vision model to extract provider names from handwritten image.
    
    Args:
        image: PIL Image object containing provider names
        
    Returns:
        Extracted text with provider names, one per line
    """
    try:
        # Convert image to base64
        buffered = BytesIO()
        image.save(buffered, format="PNG")
        img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
        
        # Improved prompt for medical provider handwriting
        prompt = """This is a handwritten list of medical provider/doctor names.

Your task: Read EVERY name from the handwritten text and list them.

Instructions:
- Read the ENTIRE page carefully
- Extract each person's name (focus on Indian/medical names)
- Output one name per line
- Skip only headers like "Provider Name"
- Include first and last names
- Do your best with unclear handwriting

Extract all names now:"""
        
        print("  [LLM] Sending image to LLaVA...")
        
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "llava:7b",
                "prompt": prompt,
                "images": [img_base64],
                "stream": False,
                "options": {"temperature": 0.1, "num_predict": 300}
            },
            timeout=60
        )
        
        if response.status_code != 200:
            print(f"  [ERROR] Ollama API error: {response.status_code}")
            return ""
        
        result = response.json()
        raw_text = result.get("response", "")
        
        # Stage 1: Basic deduplication
        lines = raw_text.strip().split('\n')
        unique = []
        seen = set()
        for line in lines:
            line = line.strip()
            if line and line.lower() not in seen:
                unique.append(line)
                seen.add(line.lower())
        
        raw_dedup = '\n'.join(unique)
        print(f"  [SUCCESS] LLaVA: {len(unique)} names ({len(lines)} total)")
        
        # Stage 2: Clean with llama3.1
        cleaned = clean_names_with_llm(raw_dedup)
        return cleaned
            
            
    except requests.exceptions.ConnectionError:
        print("  [ERROR] Could not connect to Ollama. Is it running?")
        return ""
    except Exception as e:
        print(f"  [ERROR] Vision LLM extraction failed: {e}")
        return ""


def clean_names_with_llm(raw_text: str) -> str:
    """Use llama3.1 with mock data reference to correct OCR errors."""
    try:
        # Load reference names from mock data
        import json
        from pathlib import Path
        import os
        
        # Get absolute path to mock data
        current_file = Path(__file__).resolve()
        project_root = current_file.parent.parent.parent.parent  # Up 4 levels to project root (from tools -> package -> src -> root)
        mock_path = project_root / "mock_data" / "npi_registry.json"
        
        print(f"  Loading reference from: {mock_path}")
        reference_names = []
        
        if mock_path.exists():
            try:
                with open(mock_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    reference_names = [p.get("name", "") for p in data.get("providers", [])]
                print(f"  [SUCCESS] Loaded {len(reference_names)} reference names")
            except Exception as e:
                print(f"  [WARNING] Error loading reference: {e}")
        else:
            print(f"  [WARNING] Mock data not found at {mock_path}")
        
        ref_list = "\n".join(f"- {name}" for name in reference_names) if reference_names else "(No reference available)"
        
        prompt = f"""Match OCR-extracted names to the reference database. Be LENIENT with matching - handwriting OCR is imperfect.

REFERENCE DATABASE (trusted source):
{ref_list}

OCR EXTRACTED (may have typos, missing letters, extra letters):
{raw_text}

MATCHING RULES:
1. Match names even if they have typos or missing/extra letters
2. Match based on similarity: "Prya Patel" -> "Dr Priya Patel"
3. Match if first name OR last name is similar: "Rajsh Iyer" -> "Dr Rajesh Iyer"
4. Ignore "Dr" prefix when matching
5. Be GENEROUS with matching - prioritize recall over precision
6. If a name is even 60% similar to a reference name, match it
7. Output the REFERENCE name (with "Dr"), not the OCR name
