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
        
