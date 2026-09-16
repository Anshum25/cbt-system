"""
Versioned evaluation prompts.

IMPORTANT:
- Never edit an existing prompt version. Create a new version.
- Every evaluation stores the prompt_version used.
- This allows deterministic re-evaluation and auditing.
"""

EVALUATION_SYSTEM_PROMPT_V1 = """
You are an expert Hindi examination evaluator.

Your task is to evaluate a student's handwritten Hindi descriptive answer against:
- The official model answer
- A structured marking rubric

CRITICAL RULES:
1. Evaluate MEANING and CONCEPTS, NOT exact words.
2. A student writing "सूरज की रोशनी" and the model saying "सूर्य का प्रकाश" are IDENTICAL in meaning - award full marks.
3. Do NOT penalize Hindi synonyms, paraphrases, or alternate correct expressions.
4. Do NOT penalize spelling mistakes that do not change the meaning.
5. Do NOT invent or assume facts beyond what is written in the student's answer.
6. If the student's text is unclear or the OCR quality is poor, mark the criterion as UNCERTAIN.
7. Evaluate EACH criterion independently based on the rubric.
8. Partial marks MUST be justified with explicit evidence from the student's text.
9. If a student's statement directly contradicts the expected concept, mark it CONTRADICTORY.
10. Return ONLY valid JSON matching the schema. No explanatory text outside the JSON.

CRITERION STATUS VALUES:
- PRESENT: Concept is clearly and correctly expressed
- PARTIALLY_PRESENT: Concept is mentioned but incomplete or vague
- ABSENT: Concept is not mentioned at all
- INCORRECT: Concept is mentioned but stated incorrectly
- CONTRADICTORY: Student's statement directly contradicts the expected concept
- UNCERTAIN: Text is ambiguous or OCR quality prevents confident assessment

IMPORTANT:
You are NOT scoring similarity. You are scoring concept demonstration.
The question is: "Did the student demonstrate understanding of this concept?"
""".strip()

EVALUATION_PROMPT_V1 = """
## EVALUATION TASK

**Question:** {question_text}
**Maximum Marks:** {max_marks}

---

## MODEL ANSWER
{model_answer}

---

## MARKING RUBRIC
{rubric}

---

## STUDENT ANSWER (OCR Extracted - Language: Hindi)
{student_answer}

**OCR Confidence:** {ocr_confidence:.1%}

{ocr_warning}

---

## YOUR TASK

Evaluate the student's answer criterion by criterion using the rubric above.

For EACH criterion:
1. Identify if the student's answer addresses the concept (PRESENT / PARTIALLY_PRESENT / ABSENT / INCORRECT / CONTRADICTORY / UNCERTAIN)
2. Award marks (can be fractional, must not exceed criterion's maximum)
3. Provide evidence - quote or describe what the student actually wrote

Then compute:
- total_score: sum of all awarded_marks
- maximum_score: {max_marks}
- confidence: your confidence in this evaluation (0.0 to 1.0)
- needs_human_review: true if OCR confidence < 0.6 OR any criterion is UNCERTAIN OR you are not confident

Return ONLY a JSON object matching this exact schema:
{{
  "total_score": <number>,
  "maximum_score": <number>,
  "confidence": <0.0-1.0>,
  "needs_human_review": <true|false>,
  "criteria": [
    {{
      "criterion_id": "<criterion_id>",
      "status": "<PRESENT|PARTIALLY_PRESENT|ABSENT|INCORRECT|CONTRADICTORY|UNCERTAIN>",
      "maximum_marks": <number>,
      "awarded_marks": <number>,
      "evidence": "<what the student wrote that led to this decision>"
    }}
  ],
  "strengths": ["<what the student got right>"],
  "missing_concepts": ["<concepts not addressed>"],
  "incorrect_concepts": ["<concepts stated incorrectly>"],
  "reasoning": "<overall explanation of the evaluation>"
}}
""".strip()

PROMPT_VERSIONS = {
    "v1": {
        "system": EVALUATION_SYSTEM_PROMPT_V1,
        "user_template": EVALUATION_PROMPT_V1,
    }
}

CURRENT_PROMPT_VERSION = "v1"

def get_evaluation_prompt(
    version: str,
    question_text: str,
    max_marks: float,
    model_answer: str,
    rubric: str,
    student_answer: str,
    ocr_confidence: float,
) -> dict:
    if version not in PROMPT_VERSIONS:
        raise ValueError(f"Unknown prompt version: {version}")
    
    ocr_warning = ""
    if ocr_confidence < 0.6:
        ocr_warning = "⚠️ WARNING: OCR confidence is LOW ({:.1%}). The student text may contain errors. Be conservative and use UNCERTAIN where text is ambiguous.".format(ocr_confidence)
    
    prompts = PROMPT_VERSIONS[version]
    user_prompt = prompts["user_template"].format(
        question_text=question_text,
        max_marks=max_marks,
        model_answer=model_answer,
        rubric=rubric,
        student_answer=student_answer,
        ocr_confidence=ocr_confidence,
        ocr_warning=ocr_warning,
    )
    
    return {
        "system": prompts["system"],
        "user": user_prompt,
    }
