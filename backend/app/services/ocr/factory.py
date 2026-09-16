import os
from .base import OCRProvider
from .local_tesseract import TesseractOCRProvider
from .cloud_vision import CloudVisionOCRProvider

def get_ocr_provider() -> OCRProvider:
    provider_type = os.getenv("OCR_PROVIDER", "local").lower()
    
    if provider_type == "local":
        return TesseractOCRProvider()
    elif provider_type == "cloud":
        return CloudVisionOCRProvider()
    else:
        # Default fallback
        return TesseractOCRProvider()
