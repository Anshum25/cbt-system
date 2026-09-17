import time
import google.generativeai as genai
import os
from typing import List
import PIL.Image

from .base import OCRProvider, OCRResultData

class GeminiOCRProvider(OCRProvider):
    def __init__(self):
        self.provider_name = "Gemini OCR"
        self.model_version = "gemini-3.5-flash"
        api_key = os.environ.get("GEMINI_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(self.model_version)

    def extract_text(self, file_path: str, language: str = "hin") -> OCRResultData:
        start_time = time.time()
        
        try:
            image = PIL.Image.open(file_path)
            
            prompt = "Extract all handwritten or printed text from this image exactly as written. Preserve line breaks. If there is no text, return an empty string. If the text is in Hindi or mixed English, transcribe it accurately."
            
            response = self.model.generate_content([prompt, image])
            
            text = response.text.strip()
            
            processing_time = int((time.time() - start_time) * 1000)
            
            return OCRResultData(
                page=1,
                text=text,
                confidence=0.95, # Gemini doesn't provide confidence, assume high
                provider=self.provider_name,
                model=self.model_version,
                processing_time_ms=processing_time,
                bounding_boxes="{}"
            )
        except Exception as e:
            raise Exception(f"Gemini OCR failed: {str(e)}")

    def extract_pages(self, file_paths: List[str], language: str = "hin") -> List[OCRResultData]:
        results = []
        for i, path in enumerate(file_paths):
            res = self.extract_text(path, language)
            res.page = i + 1
            results.append(res)
        return results
