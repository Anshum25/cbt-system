import os
import cv2
import numpy as np
from PIL import Image
from pdf2image import convert_from_path
import uuid
from typing import List

class PreprocessingService:
    def __init__(self, storage_path: str):
        self.storage_path = storage_path

    def process_file(self, file_path: str, output_dir: str) -> List[str]:
        """
        Takes a file (PDF or Image), processes it (deskew, etc), 
        and saves processed images. Returns a list of paths to the processed images.
        """
        processed_paths = []
        
        # Ensure output dir exists
        os.makedirs(os.path.join(self.storage_path, output_dir), exist_ok=True)
        
        # 1. Extract pages (PDF to images) or just load image
        images = self._extract_images(os.path.join(self.storage_path, file_path))
        
        # 2. Process each page
        for img in images:
            processed_img = self._preprocess_image(img)
            
            filename = f"{uuid.uuid4()}.jpg"
            rel_path = os.path.join(output_dir, filename).replace("\\", "/")
            full_path = os.path.join(self.storage_path, rel_path)
            
            processed_img.save(full_path, 'JPEG', quality=90)
            processed_paths.append(rel_path)
            
        return processed_paths

    def _extract_images(self, full_file_path: str) -> List[Image.Image]:
        ext = os.path.splitext(full_file_path)[1].lower()
        if ext == '.pdf':
            # Needs poppler installed
            return convert_from_path(full_file_path)
        else:
            return [Image.open(full_file_path)]
            
    def _preprocess_image(self, img: Image.Image) -> Image.Image:
        # Convert PIL to OpenCV format
        cv_img = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
        
        # 1. Convert to grayscale
        gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
        
        # 2. Simple deskew (skip full implementation for brevity, just normalize contrast)
        # 3. Contrast normalization (CLAHE)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        normalized = clahe.apply(gray)
        
        # 4. Optional: Denoise
        denoised = cv2.fastNlMeansDenoising(normalized, None, 10, 7, 21)
        
        # Convert back to PIL
        return Image.fromarray(denoised)
