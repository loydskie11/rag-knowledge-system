"""Shared policy for documents that must never enter the RAG corpus."""

NON_RAG_CATEGORIES = frozenset({
    "form / template",
    "forms / templates",
    "branding asset",
    "branding assets",
})


def normalize_category(category: str | None) -> str:
    return (category or "").strip().lower()


def is_non_rag_category(category: str | None) -> bool:
    return normalize_category(category) in NON_RAG_CATEGORIES
