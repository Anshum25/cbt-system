import os
import pytest
from app.services.llm.gemini_provider import GeminiLLMProvider
from app.services.evaluation.evaluator import EvaluatorService
from app.services.llm.base import EvaluationResponse

# To run this test, GEMINI_API_KEY must be set in the environment.
@pytest.fixture
def evaluator():
    # Only run if API key is present
    if not os.environ.get("GEMINI_API_KEY"):
        pytest.skip("GEMINI_API_KEY not set")
    provider = GeminiLLMProvider()
    return EvaluatorService(provider)

def get_base_params():
    return {
        "question_text": "प्रकाश संश्लेषण (Photosynthesis) क्या है?",
        "max_marks": 2.0,
        "model_answer": "प्रकाश संश्लेषण वह प्रक्रिया है जिसके द्वारा हरे पौधे सूर्य के प्रकाश की उपस्थिति में अपना भोजन बनाते हैं।",
        "criteria": [
            {
                "id": "crit1",
                "description": "Definition of photosynthesis",
                "max_marks": 2.0,
                "expected_concepts": "Process by which plants make food using sunlight",
                "optional_keywords": "सूर्य का प्रकाश, भोजन, पौधे"
            }
        ],
        "ocr_confidence": 0.95
    }

def test_same_meaning_different_wording(evaluator):
    params = get_base_params()
    # Different wording but same meaning
    params["student_answer"] = "यह वह तरीका है जिससे पेड़-पौधे सूरज की रोशनी में अपना खाना तैयार करते हैं।"
    
    response = evaluator.evaluate(**params)
    
    assert response.total_score == 2.0
    assert response.criteria[0].status == "PRESENT"
    assert response.needs_human_review == False

def test_correct_partial_answer(evaluator):
    params = get_base_params()
    # Missing mention of sunlight
    params["student_answer"] = "यह वह प्रक्रिया है जिससे पौधे अपना भोजन बनाते हैं।"
    
    response = evaluator.evaluate(**params)
    
    assert response.total_score > 0.0 and response.total_score < 2.0
    assert response.criteria[0].status == "PARTIALLY_PRESENT"

def test_completely_incorrect_answer(evaluator):
    params = get_base_params()
    params["student_answer"] = "यह वह प्रक्रिया है जिससे पानी बर्फ बनता है।"
    
    response = evaluator.evaluate(**params)
    
    assert response.total_score == 0.0
    assert response.criteria[0].status in ["ABSENT", "INCORRECT"]

def test_contradictory_answer(evaluator):
    params = get_base_params()
    params["student_answer"] = "पौधे अपना भोजन खुद नहीं बनाते, वे इसे जानवरों से प्राप्त करते हैं।"
    
    response = evaluator.evaluate(**params)
    
    assert response.total_score == 0.0
    assert response.criteria[0].status == "CONTRADICTORY"

def test_hindi_english_mixed(evaluator):
    params = get_base_params()
    params["student_answer"] = "यह एक process है जिससे plants sunlight का use करके अपना food बनाते हैं।"
    
    response = evaluator.evaluate(**params)
    
    assert response.total_score == 2.0
    assert response.criteria[0].status == "PRESENT"

def test_spelling_mistakes(evaluator):
    params = get_base_params()
    params["student_answer"] = "परकाश संशलेषण वह प्रक्रिया है जिससे पोधे सुरज की रोशनी में अपना भोंजन बनाते हैं।"
    
    response = evaluator.evaluate(**params)
    
    assert response.total_score == 2.0
    assert response.criteria[0].status == "PRESENT"

def test_empty_answer(evaluator):
    params = get_base_params()
    params["student_answer"] = "    "
    
    response = evaluator.evaluate(**params)
    
    assert response.total_score == 0.0
    assert response.criteria[0].status == "ABSENT"

def test_low_ocr_confidence(evaluator):
    params = get_base_params()
    params["student_answer"] = "प्रक$श स^श्ले#ण वह प्रक्र#या है"
    params["ocr_confidence"] = 0.4 # Below 0.6 threshold
    
    response = evaluator.evaluate(**params)
    
    assert response.needs_human_review == True
