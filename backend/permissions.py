"""Application authorization. Roles and assignments come from the database, never requests."""
import re

from fastapi import HTTPException

ROLES = {
    "SYSTEM_ADMIN", "OFFICE_HEAD", "COLLEGE_DEAN", "PROGRAM_CHAIR",
    "COLLEGE_SECRETARY", "FACULTY", "STUDENT", "DOCUMENT_CONTROLLER",
}
PERSONNEL = {
    "SYSTEM_ADMIN", "OFFICE_HEAD", "COLLEGE_DEAN", "PROGRAM_CHAIR",
    "COLLEGE_SECRETARY", "FACULTY",
}
ACADEMIC_LEADERSHIP = {"COLLEGE_DEAN", "PROGRAM_CHAIR", "COLLEGE_SECRETARY"}
ACADEMIC_GOVERNANCE_MANAGERS = {"COLLEGE_DEAN", "PROGRAM_CHAIR"}
DOCUMENT_MANAGERS = {"SYSTEM_ADMIN", "OFFICE_HEAD", *ACADEMIC_LEADERSHIP}

PROGRAM_COLLEGES = {
    "BEED": "College of Education (COEd)",
    "BSED_MATH": "College of Education (COEd)",
    "BSED_ENGLISH": "College of Education (COEd)",
    "BTLED_HE": "College of Education (COEd)",
    "AB_ELS": "College of Arts and Sciences (CAS)",
    "AB_LIT": "College of Arts and Sciences (CAS)",
    "AB_PSYCH": "College of Arts and Sciences (CAS)",
    "BSF": "College of Agriculture, Forestry, & Environmental Science (CAFES)",
    "BSA": "College of Agriculture, Forestry, & Environmental Science (CAFES)",
    "BSES": "College of Agriculture, Forestry, & Environmental Science (CAFES)",
    "BSIE": "College of Technology and Engineering (COTE)",
    "BSIT": "College of Technology and Engineering (COTE)",
    "BIT_AT": "College of Technology and Engineering (COTE)",
    "BIT_CT": "College of Technology and Engineering (COTE)",
    "BIT_DT": "College of Technology and Engineering (COTE)",
    "BIT_ET": "College of Technology and Engineering (COTE)",
    "BIT_GT": "College of Technology and Engineering (COTE)",
    "BSHM": "College of Hospitality and Tourism Management (CHTM)",
    "BSTM": "College of Hospitality and Tourism Management (CHTM)",
}


def value(obj, name, default=None):
    return obj.get(name, default) if isinstance(obj, dict) else getattr(obj, name, default)


def role_of(user):
    role = str(value(user, "role", "") or "").upper()
    # Legacy mixed administrators lose system privileges until explicitly assigned.
    return {"ADMIN": "OFFICE_HEAD", "IQA": "FACULTY"}.get(role, role)


def normalize_scope(text):
    return re.sub(r"[^a-z0-9]", "", str(text or "").lower().replace("&", "and"))


# Explicit aliases only. Substring matching could grant access to a different office.
OFFICE_ALIASES = [
    ["HRMO", "HR & Records Management", "HR", "Human Resources", "HR & Records"],
    ["Finance/Budget/Accounting/Cashier", "Administrative & Finance", "Finance", "Budget", "Accounting", "Cashier"],
    ["Student Affairs Services", "Student Affairs & Services", "SAS", "Student Affairs"],
    ["Registrar/MIS", "Registrar's Office", "Registrar", "MIS", "MIS & Information Technology Unit"],
    ["Library Services", "University Library", "Library"],
    ["Supply/Property Custodian", "Supply & Property Unit", "Supply", "Property"],
    ["Management/Leadership", "Campus Director", "Management", "Leadership"],
    ["Educational Delivery Processes", "Academic Affairs", "Instruction", "Curriculum", "Director of Instruction"],
    ["Extension", "Extension & Community Services"],
    ["Production and Resource Generation", "Production & Resource Generation"],
    ["Research and Development", "Research & Development"],
    ["Quality Assurance", "Quality Assurance & Management (QAU)", "QAU"],
    ["DRRM", "Security & Physical Plant Unit"],
]
_OFFICE_KEYS = {normalize_scope(alias): normalize_scope(group[0]) for group in OFFICE_ALIASES for alias in group}


def office_key(office):
    key = normalize_scope(office)
    return _OFFICE_KEYS.get(key, key)


def is_system_admin(user):
    return role_of(user) == "SYSTEM_ADMIN"


def is_reviewer(user):
    if is_system_admin(user):
        return True
    return role_of(user) in PERSONNEL and (
        value(user, "is_iqa_auditor", False) is True
        or office_key(value(user, "administrative_office")) == office_key("Quality Assurance")
    )


def can_access_office(user, office):
    if is_system_admin(user):
        return True
    if role_of(user) not in PERSONNEL:
        return False
    if is_reviewer(user):
        return True
    assigned = office_key(value(user, "administrative_office"))
    return bool(assigned and assigned == office_key(office))


def require_office(user, office):
    if not can_access_office(user, office):
        raise HTTPException(403, "This record is outside your assigned office.")


def accessible_programs(user):
    role = role_of(user)
    if is_system_admin(user) or is_reviewer(user):
        return list(PROGRAM_COLLEGES)
    assignment = normalize_scope(value(user, "department"))
    if not assignment:
        return []
    if role in {"COLLEGE_DEAN", "COLLEGE_SECRETARY"}:
        return [code for code, college in PROGRAM_COLLEGES.items() if normalize_scope(college) == assignment]
    if role in {"PROGRAM_CHAIR", "OFFICE_HEAD", "FACULTY"}:
        return [code for code in PROGRAM_COLLEGES if normalize_scope(code) == assignment]
    return []


def can_access_program(user, program):
    return normalize_scope(program) in {normalize_scope(code) for code in accessible_programs(user)}


def require_program(user, program):
    if role_of(user) not in PERSONNEL or not can_access_program(user, program):
        raise HTTPException(403, "This record is outside your assigned program.")


def is_governance_evidence(metadata):
    category = str(metadata.get("category", "")).casefold()
    return "evidence" in category or bool(metadata.get("iso_clause") or metadata.get("is_ched"))


def can_read_document(user, metadata):
    """Apply workflow scope to evidence wherever it is accessed, including RAG."""
    category = str(metadata.get("category", "")).casefold()
    if not is_governance_evidence(metadata):
        return True
    if metadata.get("iso_clause") or category == "iso evidence":
        return can_access_office(user, metadata.get("office"))
    try:
        require_program(user, metadata.get("program"))
        return True
    except HTTPException:
        return False


def can_manage_document(user, metadata):
    """Allow document changes only inside the manager's office or academic scope."""
    if is_system_admin(user):
        return True
    if role_of(user) not in DOCUMENT_MANAGERS:
        return False
    program = str(metadata.get("program") or "GLOBAL").strip()
    if program and program.upper() != "GLOBAL" and can_access_program(user, program):
        return True
    office = metadata.get("office")
    return bool(office and can_access_office(user, office))


def require_reviewer(user):
    if not is_reviewer(user):
        raise HTTPException(403, "A Quality Assurance or IQA reviewer assignment is required.")


def require_system_admin(user):
    if not is_system_admin(user):
        raise HTTPException(403, "System Administrator privileges are required.")


def filter_office_records(user, records, field="auditee_office"):
    return [record for record in records if can_access_office(user, value(record, field))]


def permissions_for(user):
    role = role_of(user)
    return {
        "system.manage": is_system_admin(user),
        "governance.access": role in PERSONNEL,
        "governance.review": is_reviewer(user),
        "governance.manage": role in {"OFFICE_HEAD", *ACADEMIC_GOVERNANCE_MANAGERS} or is_reviewer(user),
        "governance.cross_office": is_reviewer(user),
        "documents.manage": role in DOCUMENT_MANAGERS,
        "paper_trail.control": is_system_admin(user) or role == "DOCUMENT_CONTROLLER",
    }
