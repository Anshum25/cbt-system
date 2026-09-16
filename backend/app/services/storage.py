import os
import shutil
import uuid
from abc import ABC, abstractmethod
from fastapi import UploadFile

class StorageProvider(ABC):
    @abstractmethod
    def save_file(self, file: UploadFile, directory: str) -> str:
        pass

    @abstractmethod
    def get_file_url(self, path: str) -> str:
        pass

class LocalFileSystemStorage(StorageProvider):
    def __init__(self, base_path: str):
        self.base_path = base_path
        os.makedirs(self.base_path, exist_ok=True)

    def save_file(self, file: UploadFile, directory: str) -> str:
        target_dir = os.path.join(self.base_path, directory)
        os.makedirs(target_dir, exist_ok=True)
        
        file_ext = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(target_dir, unique_filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        return os.path.join(directory, unique_filename).replace("\\", "/")

    def get_file_url(self, path: str) -> str:
        # In a real app, this would be a URL to access the local static file
        return f"/storage_data/{path}"

def get_storage_provider() -> StorageProvider:
    storage_path = os.getenv("STORAGE_PATH", "storage_data")
    return LocalFileSystemStorage(base_path=storage_path)
