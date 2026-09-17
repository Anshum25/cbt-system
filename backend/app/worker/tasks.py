import os
from celery import shared_task
from sqlalchemy.orm import Session
import json

from app.core.database import SessionLocal
from app.models.models import ModelAnswer, StudentAnswer, AnswerPage, OCRResult, Question, EvaluationCriterion, AnswerEvaluation, Evaluation
from app.services.ocr.factory import get_ocr_provider
from app.services.preprocessing import PreprocessingService
from app.services.llm.factory import get_llm_provider
from app.services.evaluation.evaluator import EvaluatorService
from app.services.evaluation.prompts import CURRENT_PROMPT_VERSION

storage_path = os.getenv("STORAGE_PATH", "storage_data")
preprocessing_service = PreprocessingService(storage_path=storage_path)

@shared_task(bind=True, max_retries=3)
def process_model_answer_ocr(self, model_answer_id: str):
    db: Session = SessionLocal()
    try:
        model_answer = db.query(ModelAnswer).filter(ModelAnswer.id == model_answer_id).first()
        if not model_answer:
            return
            
        model_answer.processing_status = "OCR_PROCESSING"
        db.commit()
        
        # 1. Preprocess
        processed_paths = preprocessing_service.process_file(model_answer.original_file_path, "processed_model_answers")
        
        if not processed_paths:
            raise Exception("No pages extracted")
            
        # 2. OCR (we assume model answer is a single page or we concat)
        ocr_provider = get_ocr_provider()
        
        full_text = ""
        avg_conf = 0.0
        
        for path in processed_paths:
            full_path = os.path.join(storage_path, path)
            result = ocr_provider.extract_text(full_path, language="hin")
            full_text += result.text + "\n"
            avg_conf += result.confidence
            
        avg_conf = avg_conf / len(processed_paths)
        
        # 3. Update DB
        model_answer.extracted_text = full_text.strip()
        model_answer.ocr_confidence = avg_conf
        
        # Low confidence check
        if avg_conf < 0.6:
            model_answer.processing_status = "REVIEW_REQUIRED"
        else:
            model_answer.processing_status = "OCR_COMPLETED"
            
        db.commit()
        
    except Exception as exc:
        db.rollback()
        model_answer = db.query(ModelAnswer).filter(ModelAnswer.id == model_answer_id).first()
        if model_answer:
            model_answer.processing_status = "ERROR"
            db.commit()
        raise self.retry(exc=exc, countdown=60)
    finally:
        db.close()

@shared_task(bind=True, max_retries=3)
def process_student_answer_ocr(self, answer_id: str):
    db: Session = SessionLocal()
    try:
        answer = db.query(StudentAnswer).filter(StudentAnswer.id == answer_id).first()
        if not answer:
            return
            
        answer.status = "OCR_PROCESSING"
        db.commit()
        
        pages = db.query(AnswerPage).filter(AnswerPage.answer_id == answer_id).order_by(AnswerPage.page_number).all()
        
        ocr_provider = get_ocr_provider()
        
        low_confidence_flag = False
        
        for page in pages:
            # 1. Preprocess
            processed_paths = preprocessing_service.process_file(page.file_path, "processed_student_answers")
            
            # 2. OCR
            for path in processed_paths:
                full_path = os.path.join(storage_path, path)
                result = ocr_provider.extract_text(full_path, language="hin")
                
                if result.confidence < 0.6:
                    low_confidence_flag = True
                
                # 3. Save OCR Result per page
                ocr_result = OCRResult(
                    answer_id=answer_id,
                    page_id=page.id,
                    extracted_text=result.text,
                    confidence=result.confidence,
                    provider_name=result.provider,
                    provider_version=result.model,
                    processing_time_ms=result.processing_time_ms,
                    bounding_boxes=result.bounding_boxes
                )
                db.add(ocr_result)
        
        # Update answer status
        if low_confidence_flag:
            answer.status = "REVIEW_REQUIRED"
        else:
            answer.status = "OCR_COMPLETED"
            
        db.commit()
        
        # Trigger evaluation task
        evaluate_student_answer.delay(str(answer.id))
        
    except Exception as exc:
        db.rollback()
        answer = db.query(StudentAnswer).filter(StudentAnswer.id == answer_id).first()
        if answer:
            answer.status = "ERROR"
            db.commit()
        raise self.retry(exc=exc, countdown=60)
    finally:
        db.close()

@shared_task(bind=True, max_retries=3)
def evaluate_student_answer(self, answer_id: str):
    db: Session = SessionLocal()
    try:
        answer = db.query(StudentAnswer).filter(StudentAnswer.id == answer_id).first()
        if not answer or answer.status not in ["OCR_COMPLETED", "REVIEW_REQUIRED"]:
            return
            
        answer.status = "EVALUATING"
        db.commit()

        question = db.query(Question).filter(Question.id == answer.question_id).first()
        model_answer = db.query(ModelAnswer).filter(ModelAnswer.question_id == question.id).first()
        criteria = db.query(EvaluationCriterion).filter(EvaluationCriterion.question_id == question.id).all()
        ocr_results = db.query(OCRResult).filter(OCRResult.answer_id == answer_id).all()

        if not question or not model_answer or not ocr_results:
            raise Exception("Missing required data for evaluation")

        if not criteria:
            default_criterion = EvaluationCriterion(
                question_id=question.id,
                description="General correctness and completeness according to the model answer.",
                max_marks=question.max_marks
            )
            db.add(default_criterion)
            db.commit()
            db.refresh(default_criterion)
            criteria = [default_criterion]

        # Prepare inputs
        student_text = " ".join([r.corrected_text or r.extracted_text for r in ocr_results])
        ocr_confidence = sum([r.confidence for r in ocr_results if r.confidence]) / max(len([r for r in ocr_results if r.confidence]), 1)
        
        criteria_list = [
            {
                "id": str(c.id),
                "description": c.description,
                "max_marks": c.max_marks,
                "expected_concepts": c.expected_concepts,
                "optional_keywords": c.optional_keywords
            } for c in criteria
        ]

        # Call Evaluator
        llm_provider = get_llm_provider()
        evaluator = EvaluatorService(llm_provider)
        
        input_hash = evaluator.compute_input_hash(
            question.question_text, 
            model_answer.corrected_text or model_answer.extracted_text, 
            student_text
        )

        response = evaluator.evaluate(
            question_text=question.question_text,
            max_marks=question.max_marks,
            model_answer=model_answer.corrected_text or model_answer.extracted_text,
            criteria=criteria_list,
            student_answer=student_text,
            ocr_confidence=ocr_confidence
        )

        # Invalidate old evaluations for this answer
        db.query(AnswerEvaluation).filter(AnswerEvaluation.answer_id == answer_id).update({"is_active": False})

        # Save new evaluation
        db_eval = AnswerEvaluation(
            answer_id=answer_id,
            provider_name=llm_provider.provider_name,
            model_version=llm_provider.model_version,
            prompt_version=CURRENT_PROMPT_VERSION,
            input_hash=input_hash,
            raw_output=response.model_dump_json(),
            total_score=response.total_score,
            confidence=response.confidence,
            needs_human_review=response.needs_human_review or (ocr_confidence < 0.6),
            strengths=json.dumps(response.strengths),
            missing_concepts=json.dumps(response.missing_concepts),
            incorrect_concepts=json.dumps(response.incorrect_concepts),
            reasoning=response.reasoning,
            is_active=True
        )
        db.add(db_eval)
        db.flush()

        for crit in response.criteria:
            db_crit_eval = Evaluation(
                answer_evaluation_id=db_eval.id,
                answer_id=answer_id,
                criterion_id=crit.criterion_id,
                status=crit.status,
                awarded_marks=crit.awarded_marks,
                explanation=crit.evidence
            )
            db.add(db_crit_eval)

        # Update answer status
        answer.ai_score = response.total_score
        if db_eval.needs_human_review:
            answer.status = "REVIEW_REQUIRED"
        else:
            answer.status = "EVALUATED"

        db.commit()

    except Exception as exc:
        db.rollback()
        answer = db.query(StudentAnswer).filter(StudentAnswer.id == answer_id).first()
        if answer:
            answer.status = "ERROR"
            db.commit()
        raise self.retry(exc=exc, countdown=60)
    finally:
        db.close()
