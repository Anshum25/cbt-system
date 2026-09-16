import os
from .base import LLMProvider
from .gemini_provider import GeminiLLMProvider
from .openai_provider import OpenAILLMProvider

def get_llm_provider() -> LLMProvider:
    provider = os.getenv("LLM_PROVIDER", "gemini").lower()
    if provider == "openai":
        return OpenAILLMProvider()
    return GeminiLLMProvider()
