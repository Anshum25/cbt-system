from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime

class ExamBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "DRAFT"

class ExamCreate(ExamBase):
    pass

class ExamOut(ExamBase):
    id: UUID
    created_at: datetime
    class Config:
        from_attributes = True

class QuestionBase(BaseModel):
    question_text: str
    language: str = "hi"
    question_type: str = "DESCRIPTIVE"
    max_marks: float
    order_num: int = 0

class QuestionCreate(QuestionBase):
    pass

class QuestionOut(QuestionBase):
    id: UUID
    exam_id: UUID
    evaluation_status: str
    class Config:
        from_attributes = True

class ModelAnswerOut(BaseModel):
    id: UUID
    question_id: UUID
    original_file_path: str
    processing_status: str
    class Config:
        from_attributes = True

class StudentAnswerOut(BaseModel):
    id: UUID
    attempt_id: UUID
    question_id: UUID
    status: str
    ai_score: Optional[float] = None
    teacher_final_score: Optional[float] = None
    class Config:
        from_attributes = True

class AttemptCreate(BaseModel):
    student_id: UUID
    exam_id: UUID

class AttemptOut(BaseModel):
    id: UUID
    student_id: UUID
    exam_id: UUID
    status: str
    class Config:
        from_attributes = True
