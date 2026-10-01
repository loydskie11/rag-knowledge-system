"""Deterministic, model-free checks for RAG corpus and answer quality."""

import re
from typing import Iterable


STOP_WORDS = {
    "about", "after", "again", "also", "does", "from", "have", "into",
    "that", "their", "there", "these", "they", "this", "what", "when",
    "where", "which", "with", "would", "your",
}


def meaningful_terms(text: str) -> set[str]:
    return {
        token.lower()
        for token in re.findall(r"[A-Za-z0-9]{3,}", text or "")
        if token.lower() not in STOP_WORDS
    }


def text_quality(text: str) -> dict[str, float | bool]:
    """Detect empty, OCR-garbled, or mostly non-text extraction results."""
    value = (text or "").strip()
    characters = len(value)
    alphanumeric = sum(char.isalnum() for char in value)
    ratio = alphanumeric / max(characters, 1)
    repeated_noise = bool(re.search(r"(.)\1{7,}", value))
    acceptable = characters >= 80 and ratio >= 0.35 and not repeated_noise
    return {
        "acceptable": acceptable,
        "characters": characters,
        "alphanumeric_ratio": round(ratio, 4),
    }


def evidence_support(answer: str, evidence: Iterable[str]) -> float:
    """Return the proportion of answer terms supported by retrieved text."""
    answer_terms = meaningful_terms(answer)
    evidence_terms = meaningful_terms(" ".join(evidence))
    if not answer_terms:
        return 1.0
    return round(len(answer_terms & evidence_terms) / len(answer_terms), 4)


def evaluate_case(
    answer: str,
    evidence: Iterable[str],
    expected_terms: Iterable[str] = (),
    forbidden_terms: Iterable[str] = (),
    source_names: Iterable[str] = (),
) -> dict[str, object]:
    expected_terms = list(expected_terms)
    forbidden_terms = list(forbidden_terms)
    answer_lower = (answer or "").lower()
    support = evidence_support(answer, evidence)
    expected = [term for term in expected_terms if term.lower() in answer_lower]
    forbidden = [term for term in forbidden_terms if term.lower() in answer_lower]
    sources = list(source_names)
    return {
        "passed": support >= 0.20 and len(expected) == len(expected_terms) and not forbidden and bool(sources),
        "evidence_support": support,
        "missing_expected_terms": [term for term in expected_terms if term.lower() not in answer_lower],
        "forbidden_terms_found": forbidden,
        "has_sources": bool(sources),
    }
