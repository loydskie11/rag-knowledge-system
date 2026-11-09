"""Database-backed authorization for base roles and scoped personnel assignments."""
import re

from fastapi import HTTPException

BASE_ROLES = {"SYSTEM_ADMIN", "PERSONNEL", "STUDENT"}
ROLES = BASE_ROLES

ASSIGNMENT_TYPES = {
    "OFFICE_HEAD", "OFFICE_MEMBER", "COLLEGE_DEAN", "COLLEGE_SECRETARY",
    "PROGRAM_CHAIR", "FACULTY_MEMBER", "QA_HEAD", "IQA_AUDITOR",
    "SURVEY_ANALYST", "DOCUMENT_CONTROLLER",
}
ASSIGNMENT_SCOPE_TYPES = {
    "OFFICE_HEAD": {"OFFICE"}, "OFFICE_MEMBER": {"OFFICE"},
    "COLLEGE_DEAN": {"COLLEGE"}, "COLLEGE_SECRETARY": {"COLLEGE"},
    "PROGRAM_CHAIR": {"PROGRAM"}, "FACULTY_MEMBER": {"PROGRAM"},
    "QA_HEAD": {"CAMPUS"}, "IQA_AUDITOR": {"CAMPUS", "OFFICE"},
    "SURVEY_ANALYST": {"CAMPUS", "OFFICE"}, "DOCUMENT_CONTROLLER": {"CAMPUS"},
}

PROGRAM_COLLEGES = {
    "BEED": "College of Education (COEd)", "BSED_MATH": "College of Education (COEd)",
    "BSED_ENGLISH": "College of Education (COEd)", "BTLED_HE": "College of Education (COEd)",
    "AB_ELS": "College of Arts and Sciences (CAS)", "AB_LIT": "College of Arts and Sciences (CAS)",
    "AB_PSYCH": "College of Arts and Sciences (CAS)",
    "BSF": "College of Agriculture, Forestry, & Environmental Science (CAFES)",
    "BSA": "College of Agriculture, Forestry, & Environmental Science (CAFES)",
    "BSES": "College of Agriculture, Forestry, & Environmental Science (CAFES)",
    "BSIE": "College of Technology and Engineering (COTE)", "BSIT": "College of Technology and Engineering (COTE)",
    "BIT_AT": "College of Technology and Engineering (COTE)", "BIT_CT": "College of Technology and Engineering (COTE)",
    "BIT_DT": "College of Technology and Engineering (COTE)", "BIT_ET": "College of Technology and Engineering (COTE)",
    "BIT_GT": "College of Technology and Engineering (COTE)",
    "BSHM": "College of Hospitality and Tourism Management (CHTM)",
    "BSTM": "College of Hospitality and Tourism Management (CHTM)",
}

LEGACY_ROLE_ASSIGNMENTS = {
    "OFFICE_HEAD": "OFFICE_HEAD", "COLLEGE_DEAN": "COLLEGE_DEAN",
    "PROGRAM_CHAIR": "PROGRAM_CHAIR", "COLLEGE_SECRETARY": "COLLEGE_SECRETARY",
    "FACULTY": "FACULTY_MEMBER", "DOCUMENT_CONTROLLER": "DOCUMENT_CONTROLLER",
    "IQA": "IQA_AUDITOR",
}


def value(obj, name, default=None):
    return obj.get(name, default) if isinstance(obj, dict) else getattr(obj, name, default)


def normalize_scope(text):
    return re.sub(r"[^a-z0-9]", "", str(text or "").lower().replace("&", "and"))


def role_of(user):
    raw = str(value(user, "role", "") or "").upper()
    return "PERSONNEL" if raw == "ADMIN" or raw in LEGACY_ROLE_ASSIGNMENTS else raw


def assignments_of(user):
    loaded = value(user, "_effective_assignments", None)
    if loaded is not None:
        return [a for a in loaded if a.get("is_active", True)]
    raw_role = str(value(user, "role", "") or "").upper()
    assignment_type = LEGACY_ROLE_ASSIGNMENTS.get(raw_role)
    result = []
    if assignment_type:
        scope_type = next(iter(ASSIGNMENT_SCOPE_TYPES[assignment_type]))
        scope_code = "ARGAO"
        scope_name = "CTU Argao Campus"
        if scope_type == "OFFICE":
            scope_code = scope_name = value(user, "administrative_office", "")
        elif scope_type in {"COLLEGE", "PROGRAM"}:
            scope_code = scope_name = value(user, "department", "")
        result.append({"assignment_type": assignment_type, "scope_type": scope_type, "scope_code": scope_code, "scope_name": scope_name})
    if value(user, "is_iqa_auditor", False):
        result.append({"assignment_type": "IQA_AUDITOR", "scope_type": "CAMPUS", "scope_code": "ARGAO", "scope_name": "CTU Argao Campus"})
    return result


def has_assignment(user, *assignment_types):
    wanted = {item.upper() for item in assignment_types}
    return any(str(a.get("assignment_type", "")).upper() in wanted for a in assignments_of(user))


def has_campus_assignment(user, *assignment_types):
    wanted = {item.upper() for item in assignment_types}
    return any(
        str(a.get("assignment_type", "")).upper() in wanted
        and str(a.get("scope_type", "")).upper() == "CAMPUS"
        for a in assignments_of(user)
    )


def is_system_admin(user):
    return role_of(user) == "SYSTEM_ADMIN"


def is_personnel(user):
    return role_of(user) == "PERSONNEL"


def is_reviewer(user):
    return is_system_admin(user) or (is_personnel(user) and has_assignment(user, "QA_HEAD", "IQA_AUDITOR"))


def is_campus_reviewer(user):
    return is_system_admin(user) or (
        is_personnel(user) and has_campus_assignment(user, "QA_HEAD", "IQA_AUDITOR")
    )


def office_key(office):
    return normalize_scope(office)


def assigned_offices(user, assignment_types=None):
    wanted = {x.upper() for x in assignment_types} if assignment_types else None
    return [a.get("scope_name") or a.get("scope_code") for a in assignments_of(user)
            if a.get("scope_type") == "OFFICE"
            and (wanted is None or a.get("assignment_type") in wanted)
            and (a.get("scope_name") or a.get("scope_code"))]


def assigned_iso_processes(user):
    return list(value(user, "_accessible_iso_processes", []) or [])


def can_access_office(user, office):
    if is_campus_reviewer(user):
        return True
    if not is_personnel(user):
        return False
    target = office_key(office)
    allowed = [*assigned_offices(user), *assigned_iso_processes(user)]
    return bool(target and any(office_key(item) == target for item in allowed))


def require_office(user, office):
    if not can_access_office(user, office):
        raise HTTPException(403, "This record is outside your assigned office.")


def accessible_programs(user):
    if is_campus_reviewer(user):
        return list(PROGRAM_COLLEGES)
    programs = set()
    for assignment in assignments_of(user):
        kind = assignment.get("assignment_type")
        code = str(assignment.get("scope_code") or "")
        name = str(assignment.get("scope_name") or "")
        if assignment.get("scope_type") == "PROGRAM" and kind in {"PROGRAM_CHAIR", "FACULTY_MEMBER"} and code in PROGRAM_COLLEGES:
            programs.add(code)
        elif assignment.get("scope_type") == "COLLEGE" and kind in {"COLLEGE_DEAN", "COLLEGE_SECRETARY"}:
            college = name or code
            programs.update(p for p, c in PROGRAM_COLLEGES.items() if normalize_scope(c) == normalize_scope(college))
    return sorted(programs)


def can_access_program(user, program):
    return normalize_scope(program) in {normalize_scope(code) for code in accessible_programs(user)}


def require_program(user, program):
    if not can_access_program(user, program):
        raise HTTPException(403, "This record is outside your assigned program.")


def is_governance_evidence(metadata):
    category = str(metadata.get("category", "")).casefold()
    return "evidence" in category or bool(metadata.get("iso_clause") or metadata.get("is_ched"))


def document_scope(metadata):
    """Return the explicit repository scope, with safe legacy inference."""
    scope_type = str(metadata.get("scope_type") or "").strip().upper()
    scope_code = str(metadata.get("scope_code") or "").strip()
    if scope_type in {"CAMPUS", "OFFICE", "PROGRAM"}:
        if scope_type == "CAMPUS":
            return "CAMPUS", scope_code or "ARGAO"
        return scope_type, scope_code

    # Accreditation/ISO rows created before explicit repository scopes retain
    # their established program/office restrictions. Ordinary legacy
    # repository documents remain campus-readable until edited or re-uploaded.
    if is_governance_evidence(metadata):
        program = str(metadata.get("program") or "GLOBAL").strip()
        if program and program.upper() != "GLOBAL":
            return "PROGRAM", program
        office = str(metadata.get("office") or "").strip()
        if office:
            return "OFFICE", office
    return "CAMPUS", "ARGAO"


def can_read_document(user, metadata):
    scope_type, scope_code = document_scope(metadata)
    if scope_type == "CAMPUS":
        return True
    if scope_type == "OFFICE":
        return can_access_office(user, scope_code)
    return can_access_program(user, scope_code)


def can_manage_document(user, metadata):
    if is_system_admin(user):
        return True
    if not permissions_for(user)["documents.manage"]:
        return False
    scope_type, scope_code = document_scope(metadata)
    if scope_type == "CAMPUS":
        return False
    if scope_type == "OFFICE":
        return bool(scope_code and can_access_office(user, scope_code))
    return bool(scope_code and can_access_program(user, scope_code))


def require_reviewer(user):
    if not is_reviewer(user):
        raise HTTPException(403, "A Quality Assurance Head or IQA Auditor assignment is required.")


def require_campus_reviewer(user):
    if not is_campus_reviewer(user):
        raise HTTPException(403, "A campus-wide Quality Assurance Head or IQA Auditor assignment is required.")


def require_system_admin(user):
    if not is_system_admin(user):
        raise HTTPException(403, "System Administrator privileges are required.")


def filter_office_records(user, records, field="auditee_office"):
    return [record for record in records if can_access_office(user, value(record, field))]


def filter_survey_records(user, records, field="office_visited"):
    permissions = permissions_for(user)
    if permissions["survey.cross_office"]:
        return list(records)
    allowed = {office_key(name) for name in assigned_offices(user, {"OFFICE_HEAD", "SURVEY_ANALYST", "IQA_AUDITOR"})}
    return [record for record in records if office_key(value(record, field)) in allowed]


def permissions_for(user):
    admin = is_system_admin(user)
    personnel = is_personnel(user)
    reviewer = is_reviewer(user)
    campus_reviewer = is_campus_reviewer(user)
    academic = has_assignment(user, "COLLEGE_DEAN", "COLLEGE_SECRETARY", "PROGRAM_CHAIR", "FACULTY_MEMBER")
    office_member = has_assignment(user, "OFFICE_HEAD", "OFFICE_MEMBER")
    return {
        "system.manage": admin, "users.manage": admin, "audit.view": admin,
        "settings.manage": admin, "broadcast.manage": admin,
        "governance.access": admin or (personnel and (academic or office_member or reviewer)),
        "governance.review": reviewer,
        "governance.manage": admin or (personnel and (has_assignment(user, "OFFICE_HEAD", "COLLEGE_DEAN", "PROGRAM_CHAIR") or reviewer)),
        "governance.cross_office": campus_reviewer,
        "documents.manage": admin or (personnel and has_assignment(user, "OFFICE_HEAD", "COLLEGE_DEAN", "PROGRAM_CHAIR", "COLLEGE_SECRETARY")),
        "paper_trail.read": admin or personnel,
        "paper_trail.control": admin or (personnel and has_assignment(user, "DOCUMENT_CONTROLLER")),
        "survey.analytics": admin or (personnel and has_assignment(user, "OFFICE_HEAD", "SURVEY_ANALYST", "QA_HEAD", "IQA_AUDITOR")),
        "survey.cross_office": admin or (personnel and any(
            a.get("assignment_type") in {"QA_HEAD", "IQA_AUDITOR", "SURVEY_ANALYST"} and a.get("scope_type") == "CAMPUS"
            for a in assignments_of(user)
        )),
    }
