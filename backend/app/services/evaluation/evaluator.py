import hashlib
import json
import logging
from typing import Optional
from pydantic import ValidationError

from app.services.llm.base import LLMProvider, EvaluationResponse
from app.services.evaluation.prompts import get_evaluation_prompt, CURRENT_PROMPT_VERSION

logger = logging.getLogger(__name__)

MAX_RETRIES = 3

class EvaluatorService:
    def __init__(self, llm_provider: LLMProvider):
        self.llm = llm_provider

    def build_rubric_text(self, criteria: list) -> str:
        """Format rubric criteria into a readable string for the prompt."""
        lines = []
        for i, c in enumerate(criteria, 1):
            line = f"Criterion {i} (ID: {c['id']}) — {c['description']}\n  Max Marks: {c['max_marks']}"
            if c.get('expected_concepts'):
                line += f"\n  Expected Concepts: {c['expected_concepts']}"
            if c.get('optional_keywords'):
                line += f"\n  Supporting Keywords: {c['optional_keywords']}"
            lines.append(line)
        return "\n\n".join(lines)

    def compute_input_hash(self, question_text: str, model_answer: str, student_answer: str) -> str:
        """SHA256 hash of the core inputs — for deduplication and audit."""
        content = f"{question_text}|{model_answer}|{student_answer}"
        return hashlib.sha256(content.encode('utf-8')).hexdigest()

    def evaluate(
        self,
        question_text: str,
        max_marks: float,
        model_answer: str,
        criteria: list,
        student_answer: str,
        ocr_confidence: float,
        prompt_version: str = CURRENT_PROMPT_VERSION,
    ) -> EvaluationResponse:
        """
        Orchestrate the full evaluation.
        
        Retries up to MAX_RETRIES times if LLM returns invalid JSON.
        Never trusts LLM output without Pydantic validation.
        """
        rubric_text = self.build_rubric_text(criteria)
        
        prompts = get_evaluation_prompt(
            version=prompt_version,
            question_text=question_text,
            max_marks=max_marks,
            model_answer=model_answer,
            rubric=rubric_text,
            student_answer=student_answer,
            ocr_confidence=ocr_confidence,
        )

        last_error = None
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                logger.info(f"LLM evaluation attempt {attempt}/{MAX_RETRIES}")
                result = self.llm.evaluate(prompts["user"], prompts["system"])
                
                # Extra business logic validation
                self._validate_scores(result, max_marks, criteria)
                
                return result
            except ValidationError as e:
                last_error = e
                logger.warning(f"LLM output failed Pydantic validation on attempt {attempt}: {e}")
            except Exception as e:
                last_error = e
                logger.warning(f"LLM call failed on attempt {attempt}: {e}")

        raise RuntimeError(
            f"Evaluation failed after {MAX_RETRIES} attempts. Last error: {last_error}"
        )

    def _validate_scores(self, result: EvaluationResponse, max_marks: float, criteria: list) -> None:
        """
        Post-validation: ensure scored marks don't exceed maximums.
        This is an anti-hallucination guard — the LLM must not award more than the rubric allows.
        """
        criterion_map = {str(c['id']): c['max_marks'] for c in criteria}
        
        for ce in result.criteria:
            criterion_max = criterion_map.get(ce.criterion_id)
            if criterion_max is not None and ce.awarded_marks > criterion_max:
                raise ValueError(
                    f"LLM awarded {ce.awarded_marks} for criterion {ce.criterion_id}, "
                    f"which exceeds maximum {criterion_max}"
                )

        if result.total_score > max_marks:
            raise ValueError(
                f"LLM total score {result.total_score} exceeds question max marks {max_marks}"
            )
