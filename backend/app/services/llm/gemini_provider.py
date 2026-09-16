import json
import os
from .base import LLMProvider, EvaluationResponse

class GeminiLLMProvider(LLMProvider):
    def __init__(self):
        import google.generativeai as genai
        api_key = os.environ.get("GEMINI_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
        self.genai = genai

    @property
    def provider_name(self) -> str:
        return "Gemini"

    @property
    def model_version(self) -> str:
        return "gemini-1.5-pro"

    def evaluate(self, prompt: str, system_prompt: str) -> EvaluationResponse:
        model = self.genai.GenerativeModel(
            model_name=self.model_version,
            system_instruction=system_prompt,
            generation_config=self.genai.types.GenerationConfig(
                response_mime_type="application/json",
            )
        )
        response = model.generate_content(prompt)
        
        data = json.loads(response.text)
        return EvaluationResponse(**data)
