from rag_evaluation import evaluate_case, evidence_support, text_quality
from rag_policy import is_rag_active_status


def test_ocr_quality_rejects_garbled_extraction():
    assert not text_quality("!!!!!!!!! 00000000")["acceptable"]
    assert text_quality("Students must complete the required evaluation before enrollment.")["acceptable"]


def test_grounding_and_expected_terms():
    result = evaluate_case(
        "Students must complete the required evaluation before enrollment.",
        ["Students must complete the required evaluation before enrollment."],
        expected_terms=["complete", "enrollment"],
        source_names=["Student Handbook"],
    )
    assert result["passed"]
    assert evidence_support("The moon is made of cheese.", ["Students must complete enrollment."]) < 0.20


def test_only_current_reviewed_statuses_are_rag_eligible():
    assert is_rag_active_status("Active")
    assert is_rag_active_status("Approved")
    assert is_rag_active_status("Published")
    assert not is_rag_active_status("Archived")
    assert not is_rag_active_status("Superseded")
    assert not is_rag_active_status("Pending")
