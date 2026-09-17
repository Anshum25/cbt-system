import os
from .base import OCRProvider
from .local_tesseract import TesseractOCRProvider
from .cloud_vision import CloudVisionOCRProvider
from .gemini_ocr import GeminiOCRProvider

def get_ocr_provider() -> OCRProvider:
    provider_type = os.getenv("OCR_PROVIDER", "gemini").lower()
    
    if provider_type == "local":
        return TesseractOCRProvider()
    elif provider_type == "cloud":
        return CloudVisionOCRProvider()
    elif provider_type == "gemini":
        return GeminiOCRProvider()
    else:
        # Default fallback
        return GeminiOCRProvider()
