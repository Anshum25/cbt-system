import json
from .base import LLMProvider, EvaluationResponse

class OpenAILLMProvider(LLMProvider):
    def __init__(self):
        pass

    @property
    def provider_name(self) -> str:
        return "OpenAI"

    @property
    def model_version(self) -> str:
        return "gpt-4o"

    def evaluate(self, prompt: str, system_prompt: str) -> EvaluationResponse:
        # Stub implementation
        mock_json_str = """
        {
            "total_score": 5.0,
            "maximum_score": 10.0,
            "confidence": 0.90,
            "needs_human_review": true,
            "criteria": [],
            "strengths": [],
            "missing_concepts": [],
            "incorrect_concepts": [],
            "reasoning": "Stub reasoning from OpenAI"
        }
        """
        data = json.loads(mock_json_str)
        return EvaluationResponse(**data)
