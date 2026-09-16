import pytest
from app.services.llm.base import LLMProvider, EvaluationResponse
from app.services.evaluation.evaluator import EvaluatorService

class MockLLMProvider(LLMProvider):
    def __init__(self, mock_response: EvaluationResponse):
        self._mock_response = mock_response
        self.call_count = 0

    @property
    def provider_name(self) -> str:
        return "Mock"

    @property
    def model_version(self) -> str:
        return "1.0"

    def evaluate(self, prompt: str, system_prompt: str) -> EvaluationResponse:
        self.call_count += 1
        return self._mock_response

def test_evaluator_valid_scores():
    mock_resp = EvaluationResponse(
        total_score=5.0,
        maximum_score=10.0,
        confidence=0.9,
        needs_human_review=False,
        criteria=[
            {
                "criterion_id": "c1",
                "status": "PRESENT",
                "maximum_marks": 5.0,
                "awarded_marks": 5.0,
                "evidence": "Good"
            }
        ],
        strengths=[],
        missing_concepts=[],
        incorrect_concepts=[],
        reasoning="Test"
    )
    provider = MockLLMProvider(mock_resp)
    evaluator = EvaluatorService(provider)

    # Should not raise
    res = evaluator.evaluate(
        question_text="Q",
        max_marks=10.0,
        model_answer="A",
        criteria=[{"id": "c1", "description": "Desc", "max_marks": 5.0}],
        student_answer="A",
        ocr_confidence=0.9
    )
    assert res.total_score == 5.0

def test_evaluator_anti_hallucination_marks_exceed():
    mock_resp = EvaluationResponse(
        total_score=6.0,
        maximum_score=10.0,
        confidence=0.9,
        needs_human_review=False,
        criteria=[
            {
                "criterion_id": "c1",
                "status": "PRESENT",
                "maximum_marks": 5.0,
                "awarded_marks": 6.0, # Exceeds max
                "evidence": "Good"
            }
        ],
        strengths=[],
        missing_concepts=[],
        incorrect_concepts=[],
        reasoning="Test"
    )
    provider = MockLLMProvider(mock_resp)
    evaluator = EvaluatorService(provider)

    with pytest.raises(RuntimeError) as exc:
        evaluator.evaluate(
            question_text="Q",
            max_marks=10.0,
            model_answer="A",
            criteria=[{"id": "c1", "description": "Desc", "max_marks": 5.0}],
            student_answer="A",
            ocr_confidence=0.9
        )
    
    assert "exceeds maximum" in str(exc.value)

def test_evaluator_hash_determinism():
    provider = MockLLMProvider(None)
    evaluator = EvaluatorService(provider)
    
    hash1 = evaluator.compute_input_hash("Q1", "A1", "S1")
    hash2 = evaluator.compute_input_hash("Q1", "A1", "S1")
    hash3 = evaluator.compute_input_hash("Q2", "A1", "S1")
    
    assert hash1 == hash2
    assert hash1 != hash3
