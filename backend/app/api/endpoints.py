from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
import json

from app.core.database import get_db
from app.models.models import Exam, Question, ModelAnswer, Student, ExamAttempt, StudentAnswer, AnswerPage
from app.schemas.schemas import ExamCreate, ExamOut, QuestionCreate, QuestionOut, ModelAnswerOut, AttemptCreate, AttemptOut, StudentAnswerOut
from app.services.storage import get_storage_provider, StorageProvider
from app.worker.tasks import process_model_answer_ocr, process_student_answer_ocr

router = APIRouter()

@router.get("/exams", response_model=List[ExamOut])
def get_exams(db: Session = Depends(get_db)):
    return db.query(Exam).all()

@router.post("/exams", response_model=ExamOut)
def create_exam(exam: ExamCreate, db: Session = Depends(get_db)):
    db_exam = Exam(**exam.model_dump())
    db.add(db_exam)
    db.commit()
    db.refresh(db_exam)
    return db_exam

@router.get("/exams/{exam_id}", response_model=ExamOut)
def get_exam(exam_id: UUID, db: Session = Depends(get_db)):
    db_exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not db_exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return db_exam

@router.post("/exams/{exam_id}/questions", response_model=QuestionOut)
def create_question(exam_id: UUID, question: QuestionCreate, db: Session = Depends(get_db)):
    db_question = Question(exam_id=exam_id, **question.model_dump())
    db.add(db_question)
    db.commit()
    db.refresh(db_question)
    return db_question

@router.post("/questions/{question_id}/model-answer", response_model=ModelAnswerOut)
def upload_model_answer(
    question_id: UUID, 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db),
    storage: StorageProvider = Depends(get_storage_provider)
):
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    file_path = storage.save_file(file, "model_answers")
    
    db_model_answer = ModelAnswer(
        question_id=question_id,
        original_file_path=file_path,
        processing_status="UPLOADED"
    )
    db.add(db_model_answer)
    db.commit()
    db.refresh(db_model_answer)
    
    # Trigger background OCR processing
    process_model_answer_ocr.delay(str(db_model_answer.id))
    
    return db_model_answer

@router.post("/attempts", response_model=AttemptOut)
def create_attempt(attempt: AttemptCreate, db: Session = Depends(get_db)):
    db_attempt = ExamAttempt(**attempt.model_dump())
    db.add(db_attempt)
    db.commit()
    db.refresh(db_attempt)
    return db_attempt

@router.post("/attempts/{attempt_id}/answers", response_model=StudentAnswerOut)
def create_student_answer(attempt_id: UUID, question_id: UUID, db: Session = Depends(get_db)):
    db_answer = StudentAnswer(attempt_id=attempt_id, question_id=question_id)
    db.add(db_answer)
    db.commit()
    db.refresh(db_answer)
    return db_answer

@router.post("/answers/{answer_id}/upload")
def upload_student_answer_page(
    answer_id: UUID,
    page_number: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    storage: StorageProvider = Depends(get_storage_provider)
):
    answer = db.query(StudentAnswer).filter(StudentAnswer.id == answer_id).first()
    if not answer:
        raise HTTPException(status_code=404, detail="Student answer not found")
        
    file_path = storage.save_file(file, "student_answers")
    
    db_page = AnswerPage(
        answer_id=answer_id,
        page_number=page_number,
        file_path=file_path
    )
    db.add(db_page)
    
    # Update status and trigger processing
    answer.status = "OCR_PENDING"
    db.commit()
    
    process_student_answer_ocr.delay(str(answer.id))
    
    return {"message": "Page uploaded successfully and OCR queued", "file_path": file_path}

@router.get("/answers/{answer_id}/ocr")
def get_ocr_results(answer_id: UUID, db: Session = Depends(get_db)):
    results = db.query(OCRResult).filter(OCRResult.answer_id == answer_id).all()
    return results

@router.post("/answers/{answer_id}/ocr/{ocr_id}/correct")
def correct_ocr_result(
    answer_id: UUID,
    ocr_id: UUID,
    corrected_text: dict, # e.g. {"text": "..."}
    db: Session = Depends(get_db)
):
    ocr = db.query(OCRResult).filter(OCRResult.id == ocr_id, OCRResult.answer_id == answer_id).first()
    if not ocr:
        raise HTTPException(status_code=404, detail="OCR result not found")
        
    ocr.corrected_text = corrected_text.get("text")
    
    # Check if all pages for this answer are reviewed/corrected
    answer = db.query(StudentAnswer).filter(StudentAnswer.id == answer_id).first()
    answer.status = "OCR_COMPLETED" # simplified state transition
    
    db.commit()
    
    # Trigger evaluation task since OCR is now manually corrected/approved
    from app.worker.tasks import evaluate_student_answer
    evaluate_student_answer.delay(str(answer.id))
    
    return {"message": "OCR corrected and evaluation queued"}

@router.get("/answers/{answer_id}/evaluation")
def get_evaluation(answer_id: UUID, db: Session = Depends(get_db)):
    from app.models.models import AnswerEvaluation
    evaluation = db.query(AnswerEvaluation).filter(
        AnswerEvaluation.answer_id == answer_id,
        AnswerEvaluation.is_active == True
    ).first()
    
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found")
        
    return {
        "id": evaluation.id,
        "total_score": evaluation.total_score,
        "confidence": evaluation.confidence,
        "needs_human_review": evaluation.needs_human_review,
        "strengths": json.loads(evaluation.strengths) if evaluation.strengths else [],
        "missing_concepts": json.loads(evaluation.missing_concepts) if evaluation.missing_concepts else [],
        "incorrect_concepts": json.loads(evaluation.incorrect_concepts) if evaluation.incorrect_concepts else [],
        "reasoning": evaluation.reasoning,
        "criteria": [
            {
                "criterion_id": c.criterion_id,
                "status": c.status,
                "awarded_marks": c.awarded_marks,
                "explanation": c.explanation
            } for c in evaluation.criteria_evaluations
        ]
    }

@router.post("/answers/{answer_id}/review")
def submit_teacher_review(
    answer_id: UUID,
    review_data: dict, # {"teacher_id": "...", "modified_score": X, "comments": "..."}
    db: Session = Depends(get_db)
):
    from app.models.models import TeacherReview, AnswerEvaluation, CalibrationSample
    
    answer = db.query(StudentAnswer).filter(StudentAnswer.id == answer_id).first()
    if not answer:
        raise HTTPException(status_code=404, detail="Answer not found")
        
    evaluation = db.query(AnswerEvaluation).filter(
        AnswerEvaluation.answer_id == answer_id,
        AnswerEvaluation.is_active == True
    ).first()
    
    if not evaluation:
        raise HTTPException(status_code=400, detail="No active evaluation to review")
        
    # Upsert teacher review
    review = db.query(TeacherReview).filter(TeacherReview.answer_id == answer_id).first()
    if not review:
        review = TeacherReview(
            answer_id=answer_id,
            teacher_id=review_data.get("teacher_id"),
            original_ai_score=evaluation.total_score,
            modified_score=review_data.get("modified_score", evaluation.total_score),
            comments=review_data.get("comments", "")
        )
        db.add(review)
    else:
        review.modified_score = review_data.get("modified_score", evaluation.total_score)
        review.comments = review_data.get("comments", "")
        
    answer.teacher_final_score = review.modified_score
    answer.status = "FINALIZED"
    
    # Save Calibration Sample
    calibration = db.query(CalibrationSample).filter(CalibrationSample.student_answer_id == answer_id).first()
    if not calibration:
        calibration = CalibrationSample(
            question_id=answer.question_id,
            student_answer_id=answer_id,
            human_score=review.modified_score,
            ai_score=evaluation.total_score,
            details=json.dumps({"notes": review.comments})
        )
        db.add(calibration)
    else:
        calibration.human_score = review.modified_score
        calibration.details = json.dumps({"notes": review.comments})
    
    db.commit()
    return {"message": "Teacher review saved successfully"}

@router.get("/calibration")
def get_calibration_samples(db: Session = Depends(get_db)):
    from app.models.models import CalibrationSample
    return db.query(CalibrationSample).all()


