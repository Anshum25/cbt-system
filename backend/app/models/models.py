from datetime import datetime
import uuid
from typing import Optional, List
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, Enum, Float, Boolean, Table
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.dialects.postgresql import UUID

Base = declarative_base()

class TimestampMixin:
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)

class User(Base, TimestampMixin):
    __tablename__ = 'users'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    role_id = Column(UUID(as_uuid=True), ForeignKey('roles.id'))
    status = Column(String, default="ACTIVE")

    role = relationship("Role", back_populates="users", foreign_keys=[role_id])
    exams_created = relationship("Exam", foreign_keys="[Exam.created_by]")

class Role(Base, TimestampMixin):
    __tablename__ = 'roles'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, nullable=False) # e.g. ADMIN, TEACHER
    
    users = relationship("User", back_populates="role", foreign_keys="[User.role_id]")

class Exam(Base, TimestampMixin):
    __tablename__ = 'exams'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, default="DRAFT") # DRAFT, PUBLISHED, CLOSED

    questions = relationship("Question", back_populates="exam", cascade="all, delete-orphan")
    attempts = relationship("ExamAttempt", back_populates="exam", cascade="all, delete-orphan")

class Question(Base, TimestampMixin):
    __tablename__ = 'questions'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_id = Column(UUID(as_uuid=True), ForeignKey('exams.id'), nullable=False)
    question_text = Column(Text, nullable=False)
    language = Column(String, default="hi") # Hindi by default
    question_type = Column(String, default="DESCRIPTIVE")
    max_marks = Column(Float, nullable=False)
    order_num = Column(Integer, default=0)
    evaluation_status = Column(String, default="PENDING") # PENDING, READY_FOR_EVALUATION

    exam = relationship("Exam", back_populates="questions")
    model_answer = relationship("ModelAnswer", uselist=False, back_populates="question", cascade="all, delete-orphan")
    rubric_criteria = relationship("EvaluationCriterion", back_populates="question", cascade="all, delete-orphan")
    student_answers = relationship("StudentAnswer", back_populates="question")

class ModelAnswer(Base, TimestampMixin):
    __tablename__ = 'model_answers'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    question_id = Column(UUID(as_uuid=True), ForeignKey('questions.id'), nullable=False, unique=True)
    original_file_path = Column(String, nullable=False)
    extracted_text = Column(Text, nullable=True)
    corrected_text = Column(Text, nullable=True)
    normalized_text = Column(Text, nullable=True)
    ocr_confidence = Column(Float, nullable=True)
    processing_status = Column(String, default="UPLOADED") # UPLOADED, OCR_PENDING, OCR_PROCESSING, OCR_COMPLETED, ERROR

    question = relationship("Question", back_populates="model_answer")

class EvaluationCriterion(Base, TimestampMixin):
    __tablename__ = 'evaluation_criteria'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    question_id = Column(UUID(as_uuid=True), ForeignKey('questions.id'), nullable=False)
    description = Column(Text, nullable=False)
    max_marks = Column(Float, nullable=False)
    expected_concepts = Column(Text, nullable=True) # JSON or comma separated
    optional_keywords = Column(Text, nullable=True) # JSON or comma separated
    optional_notes = Column(Text, nullable=True)
    order_num = Column(Integer, default=0)

    question = relationship("Question", back_populates="rubric_criteria")

class Student(Base, TimestampMixin):
    __tablename__ = 'students'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    enrollment_number = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)

    attempts = relationship("ExamAttempt", back_populates="student")

class ExamAttempt(Base, TimestampMixin):
    __tablename__ = 'exam_attempts'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey('students.id'), nullable=False)
    exam_id = Column(UUID(as_uuid=True), ForeignKey('exams.id'), nullable=False)
    status = Column(String, default="IN_PROGRESS") # IN_PROGRESS, SUBMITTED, EVALUATING, EVALUATED

    student = relationship("Student", back_populates="attempts")
    exam = relationship("Exam", back_populates="attempts")
    answers = relationship("StudentAnswer", back_populates="attempt", cascade="all, delete-orphan")

class StudentAnswer(Base, TimestampMixin):
    __tablename__ = 'student_answers'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    attempt_id = Column(UUID(as_uuid=True), ForeignKey('exam_attempts.id'), nullable=False)
    question_id = Column(UUID(as_uuid=True), ForeignKey('questions.id'), nullable=False)
    status = Column(String, default="UPLOADED") # UPLOADED, OCR_PENDING, OCR_PROCESSING, OCR_COMPLETED, EVALUATION_PENDING, EVALUATING, EVALUATED, REVIEW_REQUIRED, TEACHER_REVIEWED, FINALIZED, ERROR
    ai_score = Column(Float, nullable=True)
    teacher_final_score = Column(Float, nullable=True)

    attempt = relationship("ExamAttempt", back_populates="answers")
    question = relationship("Question", back_populates="student_answers")
    pages = relationship("AnswerPage", back_populates="answer", cascade="all, delete-orphan")
    ocr_results = relationship("OCRResult", back_populates="answer", cascade="all, delete-orphan")
    evaluations = relationship("AnswerEvaluation", back_populates="answer", cascade="all, delete-orphan")
    teacher_review = relationship("TeacherReview", uselist=False, back_populates="answer", cascade="all, delete-orphan")

class AnswerPage(Base, TimestampMixin):
    __tablename__ = 'answer_pages'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    answer_id = Column(UUID(as_uuid=True), ForeignKey('student_answers.id'), nullable=False)
    page_number = Column(Integer, nullable=False)
    file_path = Column(String, nullable=False)
    
    answer = relationship("StudentAnswer", back_populates="pages")

class OCRResult(Base, TimestampMixin):
    __tablename__ = 'ocr_results'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    answer_id = Column(UUID(as_uuid=True), ForeignKey('student_answers.id'), nullable=False)
    page_id = Column(UUID(as_uuid=True), ForeignKey('answer_pages.id'), nullable=True)
    extracted_text = Column(Text, nullable=False)
    corrected_text = Column(Text, nullable=True)
    confidence = Column(Float, nullable=True)
    provider_name = Column(String, nullable=False)
    provider_version = Column(String, nullable=True)
    processing_time_ms = Column(Integer, nullable=True)
    error_info = Column(Text, nullable=True)
    bounding_boxes = Column(Text, nullable=True) # Stored as JSON string

    answer = relationship("StudentAnswer", back_populates="ocr_results")

class AnswerEvaluation(Base, TimestampMixin):
    __tablename__ = 'answer_evaluations'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    answer_id = Column(UUID(as_uuid=True), ForeignKey('student_answers.id'), nullable=False)
    provider_name = Column(String, nullable=False)
    model_version = Column(String, nullable=False)
    prompt_version = Column(String, nullable=False)
    input_hash = Column(String, nullable=True)
    raw_output = Column(Text, nullable=True)
    total_score = Column(Float, nullable=False)
    confidence = Column(Float, nullable=True)
    needs_human_review = Column(Boolean, default=False)
    strengths = Column(Text, nullable=True) # JSON
    missing_concepts = Column(Text, nullable=True) # JSON
    incorrect_concepts = Column(Text, nullable=True) # JSON
    reasoning = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True) # For versioning

    answer = relationship("StudentAnswer", back_populates="evaluations")
    criteria_evaluations = relationship("Evaluation", back_populates="answer_evaluation", cascade="all, delete-orphan")

class Evaluation(Base, TimestampMixin):
    __tablename__ = 'evaluations'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    answer_evaluation_id = Column(UUID(as_uuid=True), ForeignKey('answer_evaluations.id'), nullable=True)
    answer_id = Column(UUID(as_uuid=True), ForeignKey('student_answers.id'), nullable=False)
    criterion_id = Column(UUID(as_uuid=True), ForeignKey('evaluation_criteria.id'), nullable=False)
    status = Column(String, nullable=False) # PRESENT, PARTIALLY_PRESENT, ABSENT, INCORRECT, CONTRADICTORY, UNCERTAIN
    awarded_marks = Column(Float, nullable=False)
    explanation = Column(Text, nullable=False)

    answer_evaluation = relationship("AnswerEvaluation", back_populates="criteria_evaluations")
    answer = relationship("StudentAnswer")
    criterion = relationship("EvaluationCriterion")

class CalibrationSample(Base, TimestampMixin):
    __tablename__ = 'calibration_samples'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    question_id = Column(UUID(as_uuid=True), ForeignKey('questions.id'), nullable=False)
    student_answer_id = Column(UUID(as_uuid=True), ForeignKey('student_answers.id'), nullable=True)
    human_score = Column(Float, nullable=False)
    ai_score = Column(Float, nullable=True)
    details = Column(Text, nullable=True) # JSON with diffs/notes

    question = relationship("Question")
    student_answer = relationship("StudentAnswer")

class TeacherReview(Base, TimestampMixin):
    __tablename__ = 'teacher_reviews'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    answer_id = Column(UUID(as_uuid=True), ForeignKey('student_answers.id'), nullable=False, unique=True)
    teacher_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    original_ai_score = Column(Float, nullable=False)
    modified_score = Column(Float, nullable=False)
    comments = Column(Text, nullable=True)

    answer = relationship("StudentAnswer", back_populates="teacher_review")
    teacher = relationship("User", foreign_keys=[teacher_id])

class AuditLog(Base, TimestampMixin):
    __tablename__ = 'audit_logs'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    action = Column(String, nullable=False)
    entity_type = Column(String, nullable=False)
    entity_id = Column(String, nullable=False)
    details = Column(Text, nullable=True)

    user = relationship("User", foreign_keys=[user_id])
