import pytest
from app.services.ocr.local_tesseract import TesseractOCRProvider
from app.services.ocr.cloud_vision import CloudVisionOCRProvider
from app.services.ocr.factory import get_ocr_provider
import os

def test_ocr_provider_factory():
    os.environ["OCR_PROVIDER"] = "cloud"
    provider = get_ocr_provider()
    assert isinstance(provider, CloudVisionOCRProvider)
    
    os.environ["OCR_PROVIDER"] = "local"
    provider = get_ocr_provider()
    assert isinstance(provider, TesseractOCRProvider)

def test_cloud_vision_placeholder():
    provider = CloudVisionOCRProvider()
    result = provider.extract_text("dummy_path.jpg", language="hin")
    assert result.confidence == 0.99
    assert result.provider == "Cloud Vision (Placeholder)"
    assert "Placeholder Cloud Vision Hindi OCR Text" in result.text
