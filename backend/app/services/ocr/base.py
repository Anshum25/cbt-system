from abc import ABC, abstractmethod
from typing import Dict, Any, List
from pydantic import BaseModel

class OCRResultData(BaseModel):
    page: int
    text: str
    confidence: float
    provider: str
    model: str
    processing_time_ms: int
    bounding_boxes: str = "{}"

class OCRProvider(ABC):
    @abstractmethod
    def extract_text(self, file_path: str, language: str = "hin") -> OCRResultData:
        pass

    @abstractmethod
    def extract_pages(self, file_paths: List[str], language: str = "hin") -> List[OCRResultData]:
        pass
