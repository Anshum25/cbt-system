from abc import ABC, abstractmethod
from typing import List, Optional
from pydantic import BaseModel, Field

class CriterionEvaluation(BaseModel):
    criterion_id: str
    status: str = Field(..., description="PRESENT, PARTIALLY_PRESENT, ABSENT, INCORRECT, CONTRADICTORY, UNCERTAIN")
    maximum_marks: float
    awarded_marks: float
    evidence: str = Field(..., description="Explanation from the text for this evaluation")

class EvaluationResponse(BaseModel):
    total_score: float
    maximum_score: float
    confidence: float = Field(..., ge=0.0, le=1.0)
    needs_human_review: bool
    criteria: List[CriterionEvaluation]
    strengths: List[str]
    missing_concepts: List[str]
    incorrect_concepts: List[str]
    reasoning: str

class LLMProvider(ABC):
    @property
    @abstractmethod
    def provider_name(self) -> str:
        pass

    @property
    @abstractmethod
    def model_version(self) -> str:
        pass

    @abstractmethod
    def evaluate(self, prompt: str, system_prompt: str) -> EvaluationResponse:
        pass
