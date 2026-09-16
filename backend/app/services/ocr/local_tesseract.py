import time
import pytesseract
from PIL import Image
from typing import List

from .base import OCRProvider, OCRResultData

class TesseractOCRProvider(OCRProvider):
    def __init__(self):
        self.provider_name = "Tesseract (Local)"
        self.model_version = "v5.x"

    def extract_text(self, file_path: str, language: str = "hin") -> OCRResultData:
        start_time = time.time()
        
        try:
            image = Image.open(file_path)
            # Use combined hin+eng to support mixed English words in Hindi text
            lang = "hin+eng" if language == "hin" else language
            
            text = pytesseract.image_to_string(image, lang=lang)
            
            # Simple confidence estimation since image_to_string doesn't return it
            # To get real confidence, image_to_data should be used
            data = pytesseract.image_to_data(image, lang=lang, output_type=pytesseract.Output.DICT)
            confidences = [int(conf) for conf in data['conf'] if int(conf) != -1]
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
            
            processing_time = int((time.time() - start_time) * 1000)
            
            return OCRResultData(
                page=1,
                text=text.strip(),
                confidence=avg_confidence / 100.0, # Normalize to 0-1
                provider=self.provider_name,
                model=self.model_version,
                processing_time_ms=processing_time,
                bounding_boxes="{}" # Placeholder for actual bounding boxes JSON
            )
        except Exception as e:
            # Re-raise to be handled by the worker
            raise Exception(f"Tesseract OCR failed: {str(e)}")

    def extract_pages(self, file_paths: List[str], language: str = "hin") -> List[OCRResultData]:
        results = []
        for i, path in enumerate(file_paths):
            res = self.extract_text(path, language)
            res.page = i + 1
            results.append(res)
        return results
