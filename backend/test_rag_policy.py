from rag_policy import is_non_rag_category, normalize_category


def test_non_rag_categories_are_case_and_whitespace_insensitive():
    assert is_non_rag_category(" Form / Template ")
    assert is_non_rag_category("BRANDING ASSETS")
    assert not is_non_rag_category("Student Handbook")


def test_empty_category_is_safe():
    assert normalize_category(None) == ""
    assert not is_non_rag_category(None)
