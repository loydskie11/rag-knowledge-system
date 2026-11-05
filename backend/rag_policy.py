"""Shared policy for documents that must never enter the RAG corpus."""

NON_RAG_CATEGORIES = frozenset({
    "form / template",
    "forms / templates",
    "branding asset",
    "branding assets",
})

# Only reviewed/current documents are allowed to answer policy questions.
# Missing status is treated as Active for backwards compatibility with legacy
# chunks created before document status was persisted in metadata.
RAG_ACTIVE_STATUSES = frozenset({
    "active",
    "approved",
    "published",
})


def normalize_category(category: str | None) -> str:
    return (category or "").strip().lower()


def is_non_rag_category(category: str | None) -> bool:
    return normalize_category(category) in NON_RAG_CATEGORIES


def normalize_status(status: str | None) -> str:
    return (status or "active").strip().lower()


def is_rag_active_status(status: str | None) -> bool:
    """Return whether a document may be used as answer evidence."""
    return normalize_status(status) in RAG_ACTIVE_STATUSES
