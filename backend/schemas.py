from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from datetime import datetime, date
import uuid
from typing import Optional, List, Union

CAR_LIFECYCLE_STATUSES = {
    "Draft", "Issued", "Acknowledged", "Response Submitted", "In Progress",
    "Awaiting Verification", "Returned", "Closed", "Void",
}


def validate_optional_iso_date(value: Optional[str], field_label: str) -> Optional[str]:
    if value is None or value == "":
        return None
    try:
        date.fromisoformat(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field_label} must use YYYY-MM-DD format.") from exc
    return value

# What the user sends us when they sign up
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: str  # NEW: We now accept the role from the frontend
    full_name: str
    course: Optional[str] = None  # NEW
    year: Optional[str] = None    # NEW
    department: Optional[str] = None
    administrative_office: Optional[str] = None
    is_iqa_auditor: Optional[bool] = False

# What we send back to the user (Notice we DO NOT send the password back!)
class UserResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    role: str
    full_name: Optional[str] = None  # NEW
    department: Optional[str] = None
    administrative_office: Optional[str] = None
    is_iqa_auditor: Optional[bool] = False
    is_verified: bool                # NEW
    created_by_admin: Optional[bool] = False
    email_changed: Optional[bool] = False
    status: Optional[str] = "Active"
    created_at: datetime
    assignments: List[dict] = Field(default_factory=list)

    class Config:
        from_attributes = True

# What we send back when the user successfully logs in
class Token(BaseModel):
    access_token: Optional[str] = None
    token_type: str
    full_name: str  # NEW
    email: str      # NEW
    role: str       # NEW
    department: Optional[str] = "BSIT"
    administrative_office: Optional[str] = None
    is_iqa_auditor: Optional[bool] = False

# --- NEW: ANNOUNCEMENT SCHEMAS ---
class AnnouncementCreate(BaseModel):
    title: str
    content: str
    recipients: str
    schedule_date: Optional[str] = None
    status: str
    sent_by: str
    total_recipients: int

class AnnouncementResponse(BaseModel):
    id: uuid.UUID
    title: str
    content: str
    recipients: str
    sent_date: datetime
    sent_by: str
    status: str
    read_count: int
    total_recipients: int

    class Config:
        from_attributes = True

class AnnouncementUpdate(BaseModel):
    title: str
    content: str
    recipients: str
    schedule_date: Optional[str] = None
    status: str
    total_recipients: int

# --- NEW: CHED MONITORING SCHEMAS ---
class ChedRequirementCreate(BaseModel):
    program: str
    cmo_name: str
    description: str

class ChedEvidenceResponse(BaseModel):
    id: uuid.UUID
    document_name: str
    file_name: Optional[str] = None
    file_url: str
    uploaded_by: str
    uploader_name: Optional[str] = None
    status: str = "Pending Verification"
    upload_date: datetime

    class Config:
        from_attributes = True

class ChedRequirementResponse(BaseModel):
    id: uuid.UUID
    program: str
    cmo_name: str
    description: str
    status: str
    evidences: list[ChedEvidenceResponse] = [] # Automatically nests attached files!

    class Config:
        from_attributes = True

# --- NEW: PAPER TRAIL SCHEMAS ---
class PaperTrailCreate(BaseModel):
    title: str
    document_type: str
    office: str
    sender_name: str
    sender_email: str
    sender_role: str = "PERSONNEL"
    recipient_name: Optional[str] = None
    recipient_email: Optional[str] = None
    recipient_role: Optional[str] = None
    origin_office: Optional[str] = None
    origin_person: Optional[str] = None
    current_location: Optional[str] = None
    transaction_type: Optional[str] = "Submission"
    is_controlled_document: bool = False
    remarks: Optional[str] = None
    storage_path: Optional[str] = None
    file_url: Optional[str] = None

class PaperTrailRequestCreate(BaseModel):
    title: str
    document_type: str
    office: str
    target_person_name: Optional[str] = None
    target_person_email: Optional[str] = None
    origin_office: Optional[str] = None
    instructions: Optional[str] = None

class PaperTrailFulfillRequest(BaseModel):
    storage_path: Optional[str] = None
    file_url: Optional[str] = None
    remarks: Optional[str] = None

class PaperTrailMetadataUpdate(BaseModel):
    title: str
    document_type: str
    office: str
    origin_office: Optional[str] = None
    origin_person: Optional[str] = None
    recipient_name: Optional[str] = None
    recipient_email: Optional[str] = None
    remarks: Optional[str] = None

class PaperTrailStatusUpdate(BaseModel):
    status: str # "Received", "Under Review", "Approved", "Needs Revision", "Forwarded", "Released"
    actor_name: str
    actor_email: str
    actor_role: str
    action_type: Optional[str] = "Acknowledge" # "Acknowledge", "Forward", "Return", "Release", "Approve"
    target_office: Optional[str] = None
    target_person: Optional[str] = None
    notes: Optional[str] = None

class PaperTrailLogResponse(BaseModel):
    id: uuid.UUID
    record_id: uuid.UUID
    action: str
    status: str
    actor_name: str
    actor_email: str
    actor_role: str
    notes: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True

class PaperTrailRecordResponse(BaseModel):
    id: uuid.UUID
    tracking_number: str
    title: str
    document_type: str
    office: str
    sender_name: str
    sender_email: str
    sender_role: str
    recipient_name: Optional[str] = None
    recipient_email: Optional[str] = None
    recipient_role: Optional[str] = None
    origin_office: Optional[str] = None
    origin_person: Optional[str] = None
    current_location: Optional[str] = None
    transaction_type: Optional[str] = "Submission"
    is_controlled_document: bool = False
    status: str
    remarks: Optional[str] = None
    file_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    logs: list[PaperTrailLogResponse] = []

    class Config:
        from_attributes = True


class ISORequirementCreate(BaseModel):
    program: str
    iso_clause: str
    title: str
    description: str
    auditee_office: str
    risk_level: Optional[str] = "Medium"
    cycle_year: Optional[str] = "2025 Surveillance"

    @field_validator("risk_level")
    @classmethod
    def validate_risk_level(cls, value: Optional[str]) -> str:
        normalized = (value or "Medium").strip().title()
        if normalized == "Low Risk":
            normalized = "Low"
        if normalized not in {"High", "Medium", "Low"}:
            raise ValueError("Risk level must be High, Medium, or Low.")
        return normalized

class ISOEvidenceResponse(BaseModel):
    id: uuid.UUID
    iso_requirement_id: uuid.UUID
    document_name: str
    file_url: str
    uploaded_by: str
    upload_date: datetime
    status: Optional[str] = "Pending"
    admin_feedback: Optional[str] = None

    class Config:
        from_attributes = True

class ISORequirementResponse(BaseModel):
    id: uuid.UUID
    program: str
    iso_clause: str
    title: str
    description: str
    auditee_office: str
    risk_level: str
    status: str
    cycle_year: str = "2025 Surveillance"
    created_at: datetime
    evidences: list[ISOEvidenceResponse] = []

    class Config:
        from_attributes = True

class ISOCycleCreate(BaseModel):
    cycle_year: str


class ISOAuditCycleUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    standard_version: str = Field(min_length=1, max_length=100)
    status: str

    @field_validator("name", "standard_version")
    @classmethod
    def strip_cycle_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("This field cannot be empty.")
        return normalized

    @field_validator("status")
    @classmethod
    def validate_cycle_status(cls, value: str) -> str:
        normalized = value.strip().upper()
        if normalized not in {"PLANNED", "ACTIVE", "CLOSED"}:
            raise ValueError("Cycle status must be Planned, Active, or Closed.")
        return normalized


class ISOAuditResultCreate(BaseModel):
    cycle_id: uuid.UUID
    standard_version: str = Field(min_length=1, max_length=100)
    result_type: str
    audit_start_date: Optional[date] = None
    audit_end_date: date
    auditor_or_certification_body: str = Field(min_length=1, max_length=255)
    conclusion: str = Field(min_length=1, max_length=255)
    certification_status: Optional[str] = None
    major_nonconformities: int = Field(default=0, ge=0)
    minor_nonconformities: int = Field(default=0, ge=0)
    observations: int = Field(default=0, ge=0)
    opportunities_for_improvement: int = Field(default=0, ge=0)
    summary: str = Field(min_length=1)


class ISOAuditResultUpdate(ISOAuditResultCreate):
    record_status: str = "DRAFT"


class ISOAuditResultResponse(BaseModel):
    id: uuid.UUID
    cycle_id: uuid.UUID
    cycle_name: str
    standard_version: str
    result_type: str
    audit_start_date: Optional[datetime] = None
    audit_end_date: datetime
    auditor_or_certification_body: str
    conclusion: str
    certification_status: Optional[str] = None
    major_nonconformities: int
    minor_nonconformities: int
    observations: int
    opportunities_for_improvement: int
    summary: str
    report_url: Optional[str] = None
    report_original_filename: Optional[str] = None
    certificate_url: Optional[str] = None
    certificate_original_filename: Optional[str] = None
    record_status: str
    created_by: str
    finalized_by: Optional[str] = None
    finalized_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class ISOAuditCycleResponse(BaseModel):
    id: uuid.UUID
    name: str
    standard_version: str
    status: str

class ISOStatusUpdate(BaseModel):
    status: str # Compliant, Pending, Not Compliant


class IQAScheduleUpdate(BaseModel):
    academic_year: str
    day1_date: str
    day1_title: str
    day1_scope: str
    day2_date: str
    day2_title: str
    day2_scope: str
    day3_date: str
    day3_title: str
    day3_scope: str

class IQAScheduleResponse(BaseModel):
    id: uuid.UUID
    program: str
    academic_year: str
    day1_date: str
    day1_title: str
    day1_scope: str
    day2_date: str
    day2_title: str
    day2_scope: str
    day3_date: str
    day3_title: str
    day3_scope: str
    updated_at: datetime

    class Config:
        from_attributes = True


class IQADayScheduleCreate(BaseModel):
    cycle_year: str = "2025 Surveillance"
    day_number: int
    day_date: str
    title: str
    scope: str

    @field_validator("day_date")
    @classmethod
    def validate_day_date(cls, value: str) -> str:
        return validate_optional_iso_date(value, "Audit date") or value

class IQADayScheduleResponse(BaseModel):
    id: uuid.UUID
    program: str
    cycle_year: str = "2025 Surveillance"
    day_number: int
    day_date: str
    title: str
    scope: str
    created_at: datetime

    class Config:
        from_attributes = True


class QMSEvidenceResponse(BaseModel):
    id: uuid.UUID
    action_plan_id: uuid.UUID
    document_name: str
    file_url: str
    uploaded_by: str
    upload_date: datetime

    class Config:
        from_attributes = True


class QMSActionPlanCreate(BaseModel):
    car_id: uuid.UUID
    cycle_year: str = "2025 Surveillance"
    auditee_office: str
    process_area: str
    opportunity_type: str = "Process"
    findings: str
    root_cause: Optional[str] = None
    immediate_action: Optional[str] = None
    corrective_measure: str
    target_date: str
    personnel_responsible: str
    owner_user_id: Optional[uuid.UUID] = None
    action_type: str = Field(default="CORRECTIVE_ACTION", pattern=r"^(CORRECTION_CONTAINMENT|CORRECTIVE_ACTION)$")
    expected_evidence: str = Field(min_length=3, max_length=4000)
    status: str = "In Progress"
    actual_completion_date: Optional[str] = None
    assessment_date: Optional[str] = None
    assessment_notes: Optional[str] = None

    @field_validator("target_date", "actual_completion_date", "assessment_date")
    @classmethod
    def validate_qms_dates(cls, value: Optional[str], info):
        return validate_optional_iso_date(value, info.field_name.replace("_", " ").title())

    @model_validator(mode="after")
    def validate_qms_date_order(self):
        if self.actual_completion_date and self.assessment_date and self.assessment_date < self.actual_completion_date:
            raise ValueError("Assessment date cannot be before the actual completion date.")
        return self

class QMSActionPlanUpdate(BaseModel):
    auditee_office: Optional[str] = None
    process_area: Optional[str] = None
    opportunity_type: Optional[str] = None
    findings: Optional[str] = None
    root_cause: Optional[str] = None
    immediate_action: Optional[str] = None
    corrective_measure: Optional[str] = None
    target_date: Optional[str] = None
    personnel_responsible: Optional[str] = None
    owner_user_id: Optional[uuid.UUID] = None
    action_type: Optional[str] = Field(default=None, pattern=r"^(CORRECTION_CONTAINMENT|CORRECTIVE_ACTION)$")
    expected_evidence: Optional[str] = Field(default=None, min_length=3, max_length=4000)
    status: Optional[str] = None
    actual_completion_date: Optional[str] = None
    assessment_date: Optional[str] = None
    assessment_notes: Optional[str] = None

    @field_validator("target_date", "actual_completion_date", "assessment_date")
    @classmethod
    def validate_qms_dates(cls, value: Optional[str], info):
        return validate_optional_iso_date(value, info.field_name.replace("_", " ").title())

    @model_validator(mode="after")
    def validate_qms_date_order(self):
        if self.actual_completion_date and self.assessment_date and self.assessment_date < self.actual_completion_date:
            raise ValueError("Assessment date cannot be before the actual completion date.")
        return self

class QMSActionPlanResponse(BaseModel):
    id: uuid.UUID
    car_id: uuid.UUID
    car_no: Optional[str] = None
    car_status: Optional[str] = None
    iso_clause_id: Optional[uuid.UUID] = None
    cycle_year: str
    auditee_office: str
    process_area: str
    opportunity_type: str
    findings: str
    root_cause: Optional[str] = None
    immediate_action: Optional[str] = None
    corrective_measure: str
    target_date: str
    personnel_responsible: str
    owner_user_id: Optional[uuid.UUID] = None
    owner_name: Optional[str] = None
    sequence_number: int
    action_type: str
    expected_evidence: str
    status: str
    actual_completion_date: Optional[str] = None
    assessment_date: Optional[str] = None
    assessment_notes: Optional[str] = None
    created_by: str
    created_at: datetime
    updated_at: datetime
    evidences: Optional[List[QMSEvidenceResponse]] = []

    class Config:
        from_attributes = True


# --- NEW: ACCREDITATION SCHEMAS ---
class AccreditationHistoryResponse(BaseModel):
    id: uuid.UUID
    level_achieved: str
    date_granted: datetime
    valid_until: Optional[datetime] = None
    certificate_url: Optional[str] = None
    remarks: Optional[str] = None
    cycle_id: Optional[uuid.UUID] = None

    class Config:
        from_attributes = True

class AccreditationCycleResponse(BaseModel):
    id: uuid.UUID
    program_id: uuid.UUID
    level_name: str
    attempt_number: int
    cycle_label: str
    status: str
    source: str
    opened_at: datetime
    closed_at: Optional[datetime] = None
    valid_until: Optional[datetime] = None

    class Config:
        from_attributes = True


class AaccupEvidenceResponse(BaseModel):
    evidence_id: uuid.UUID
    cycle_id: uuid.UUID
    program: str
    name: str
    area_code: str
    requirement_target: str
    status: str
    admin_feedback: Optional[str] = None
    uploaded_by: Optional[str] = None
    upload_date: Optional[str] = None
    original_filename: Optional[str] = None


class ProgramAccreditationResponse(BaseModel):
    id: uuid.UUID
    program_code: str
    current_level: str
    status: str
    active_areas: Optional[str] = "Area I,Area II,Area III,Area IV,Area V,Area VI,Area VII,Area VIII,Area IX,Area X"
    valid_until: Optional[datetime] = None
    history: List[AccreditationHistoryResponse] = []
    active_cycle: Optional[AccreditationCycleResponse] = None
    cycles: List[AccreditationCycleResponse] = []

    class Config:
        from_attributes = True

class UpgradeAccreditationRequest(BaseModel):
    new_level: Optional[str] = None
    active_areas: Optional[str] = None
    valid_until_date: Optional[str] = None # YYYY-MM-DD
    certificate_url: Optional[str] = None
    remarks: Optional[str] = None

class AaccupRequirementCreate(BaseModel):
    area_code: str
    area_title: str
    description: str

class AaccupRequirementResponse(BaseModel):
    id: uuid.UUID
    area_code: str
    area_title: str
    description: str
    created_at: datetime

    class Config:
        from_attributes = True


# --- CLIENT SATISFACTION SURVEY SCHEMAS ---
class CssResponseCreate(BaseModel):
    survey_year: Optional[int] = None
    survey_date: Optional[date] = None
    client_type: Optional[str] = None
    date_of_service: Optional[date] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    region: Optional[str] = None
    service_availed: Optional[str] = None
    campus: Optional[str] = None
    office_visited: Optional[str] = None
    office_other: Optional[str] = None
    cc1: Optional[str] = None
    cc2: Optional[str] = None
    cc3: Optional[str] = None
    sqd0: Optional[str] = None
    sqd1: Optional[str] = None
    sqd2: Optional[str] = None
    sqd3: Optional[str] = None
    sqd4: Optional[str] = None
    sqd5: Optional[str] = None
    sqd6: Optional[str] = None
    sqd7: Optional[str] = None
    sqd8: Optional[str] = None
    suggestions: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[str] = None

class CssResponseOut(BaseModel):
    id: uuid.UUID
    created_at: datetime
    survey_year: Optional[int] = None
    survey_date: Optional[date] = None
    client_type: Optional[str] = None
    date_of_service: Optional[date] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    region: Optional[str] = None
    service_availed: Optional[str] = None
    campus: Optional[str] = None
    office_visited: Optional[str] = None
    office_other: Optional[str] = None
    cc1: Optional[str] = None
    cc2: Optional[str] = None
    cc3: Optional[str] = None
    sqd0: Optional[str] = None
    sqd1: Optional[str] = None
    sqd2: Optional[str] = None
    sqd3: Optional[str] = None
    sqd4: Optional[str] = None
    sqd5: Optional[str] = None
    sqd6: Optional[str] = None
    sqd7: Optional[str] = None
    sqd8: Optional[str] = None
    suggestions: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[str] = None

    class Config:
        from_attributes = True

class CARFormCreate(BaseModel):
    cycle_year: str = "2025 Surveillance"
    iso_clause_id: Optional[str] = None
    car_no: Optional[str] = None
    date_issued: Optional[str] = None
    revision: Optional[str] = None
    finding_category: Optional[str] = "UNKNOWN"
    type_of_non_conformity: Optional[str] = None
    auditor_name: Optional[str] = None
    initiator: Optional[str] = None
    acknowledged_by: Optional[str] = None
    campus: Optional[str] = None
    area: Optional[str] = None
    findings: Optional[str] = None
    requirement_reference: Optional[str] = None
    objective_evidence: Optional[str] = None
    nonconformity_statement: Optional[str] = None
    root_cause: Optional[str] = None
    root_cause_method: Optional[str] = Field(default=None, pattern=r"^(FIVE_WHYS|FISHBONE|FREE_FORM)$")
    root_cause_analysis: Optional[dict] = None
    immediate_action: Optional[str] = None
    corrective_measure: Optional[str] = None
    measures_proposed_by: Optional[str] = None
    target_date: Optional[str] = None
    status: str = "Issued"
    follow_up_result: Optional[str] = None
    follow_up_date: Optional[str] = None
    comments_remarks: Optional[str] = None
    non_conformity_closed: Optional[bool] = False
    assigned_to_id: Optional[uuid.UUID] = None
    source_file_path: Optional[str] = None
    source_file_name: Optional[str] = None
    source_mime_type: Optional[str] = None
    source_file_size: Optional[int] = None
    source_sha256: Optional[str] = None
    ocr_model: Optional[str] = None
    ocr_version: Optional[str] = None
    ocr_extracted_at: Optional[datetime] = None
    ocr_raw_json: Optional[dict] = None
    ocr_confidence_json: Optional[dict] = None
    human_verified: bool = False

    @field_validator("iso_clause_id", mode="before")
    @classmethod
    def empty_str_to_none(cls, v):
        # Frontend sends "" when no ISO clause is selected; convert to None
        # so the FK column receives NULL instead of an invalid UUID string
        if v == "" or v is None:
            return None
        return v

    @field_validator("assigned_to_id", mode="before")
    @classmethod
    def empty_assignee_to_none(cls, value):
        return None if value in ("", None) else value

    @field_validator("date_issued", "target_date", "follow_up_date")
    @classmethod
    def validate_car_dates(cls, value: Optional[str], info):
        return validate_optional_iso_date(value, info.field_name.replace("_", " ").title())

    @field_validator("status")
    @classmethod
    def validate_initial_car_status(cls, value: str):
        if value not in {"Draft", "Issued"}:
            raise ValueError("A new CAR can only be saved as Draft or Issued.")
        return value

    @model_validator(mode="after")
    def validate_car_date_order(self):
        if self.date_issued and self.target_date and self.target_date < self.date_issued:
            raise ValueError("Target date cannot be before the CAR issue date.")
        if self.date_issued and self.follow_up_date and self.follow_up_date < self.date_issued:
            raise ValueError("Follow-up date cannot be before the CAR issue date.")
        return self

class CARFormUpdate(BaseModel):
    car_no: Optional[str] = None
    date_issued: Optional[str] = None
    revision: Optional[str] = None
    finding_category: Optional[str] = None
    type_of_non_conformity: Optional[str] = None
    auditor_name: Optional[str] = None
    initiator: Optional[str] = None
    acknowledged_by: Optional[str] = None
    campus: Optional[str] = None
    area: Optional[str] = None
    findings: Optional[str] = None
    requirement_reference: Optional[str] = None
    objective_evidence: Optional[str] = None
    nonconformity_statement: Optional[str] = None
    root_cause: Optional[str] = None
    root_cause_method: Optional[str] = Field(default=None, pattern=r"^(FIVE_WHYS|FISHBONE|FREE_FORM)$")
    root_cause_analysis: Optional[dict] = None
    immediate_action: Optional[str] = None
    corrective_measure: Optional[str] = None
    measures_proposed_by: Optional[str] = None
    target_date: Optional[str] = None
    status: Optional[str] = None
    follow_up_result: Optional[str] = None
    follow_up_date: Optional[str] = None
    comments_remarks: Optional[str] = None
    non_conformity_closed: Optional[bool] = None
    assigned_to_id: Optional[uuid.UUID] = None
    human_verified: Optional[bool] = None
    effectiveness_outcome: Optional[str] = Field(default=None, pattern=r"^(EFFECTIVE|PARTIALLY_EFFECTIVE|INEFFECTIVE|ADDITIONAL_EVIDENCE_REQUIRED)$")
    void_reason: Optional[str] = Field(default=None, max_length=4000)

    @field_validator("assigned_to_id", mode="before")
    @classmethod
    def empty_assignee_to_none(cls, value):
        return None if value in ("", None) else value

    @field_validator("date_issued", "target_date", "follow_up_date")
    @classmethod
    def validate_car_dates(cls, value: Optional[str], info):
        return validate_optional_iso_date(value, info.field_name.replace("_", " ").title())

    @field_validator("status")
    @classmethod
    def validate_car_status(cls, value: Optional[str]):
        if value is not None and value not in CAR_LIFECYCLE_STATUSES:
            raise ValueError("Invalid CAR lifecycle status.")
        return value

    @model_validator(mode="after")
    def validate_car_date_order(self):
        if self.date_issued and self.target_date and self.target_date < self.date_issued:
            raise ValueError("Target date cannot be before the CAR issue date.")
        if self.date_issued and self.follow_up_date and self.follow_up_date < self.date_issued:
            raise ValueError("Follow-up date cannot be before the CAR issue date.")
        return self

class CARVerificationEvidenceResponse(BaseModel):
    id: uuid.UUID
    car_id: uuid.UUID
    file_name: str
    mime_type: Optional[str] = None
    file_size: int
    sha256: str
    notes: Optional[str] = None
    uploaded_by_id: Optional[uuid.UUID] = None
    uploaded_by_name: Optional[str] = None
    uploaded_at: datetime

    class Config:
        from_attributes = True


class CARStatusHistoryResponse(BaseModel):
    id: uuid.UUID
    from_status: Optional[str] = None
    to_status: str
    reason: Optional[str] = None
    changed_by_id: Optional[uuid.UUID] = None
    changed_by_name: Optional[str] = None
    changed_at: datetime

    class Config:
        from_attributes = True


class CARRevisionHistoryResponse(BaseModel):
    id: uuid.UUID
    changed_fields: dict
    changed_by_id: Optional[uuid.UUID] = None
    changed_by_name: Optional[str] = None
    changed_at: datetime

    class Config:
        from_attributes = True


class CARFormResponse(BaseModel):
    id: uuid.UUID
    cycle_year: str
    cycle_id: uuid.UUID
    iso_clause_id: Optional[uuid.UUID] = None  # DB returns UUID object, not str
    audit_finding_id: uuid.UUID
    car_no: Optional[str] = None
    date_issued: Optional[str] = None
    revision: Optional[str] = None
    finding_category: Optional[str] = None
    type_of_non_conformity: Optional[str] = None
    auditor_name: Optional[str] = None
    initiator: Optional[str] = None
    acknowledged_by: Optional[str] = None
    campus: Optional[str] = None
    area: Optional[str] = None
    responsible_office: str
    findings: Optional[str] = None
    requirement_reference: Optional[str] = None
    objective_evidence: Optional[str] = None
    nonconformity_statement: Optional[str] = None
    root_cause: Optional[str] = None
    root_cause_method: Optional[str] = None
    root_cause_analysis: Optional[dict] = None
    immediate_action: Optional[str] = None
    corrective_measure: Optional[str] = None
    measures_proposed_by: Optional[str] = None
    target_date: Optional[str] = None
    status: str
    follow_up_result: Optional[str] = None
    follow_up_date: Optional[str] = None
    comments_remarks: Optional[str] = None
    non_conformity_closed: Optional[bool] = False
    created_at: datetime
    updated_at: datetime
    action_plan_id: Optional[uuid.UUID] = None
    action_plan_count: int = 0
    issued_by_id: Optional[uuid.UUID] = None
    acknowledged_by_id: Optional[uuid.UUID] = None
    assigned_to_id: Optional[uuid.UUID] = None
    verified_by_id: Optional[uuid.UUID] = None
    issued_by_name: Optional[str] = None
    acknowledged_by_name: Optional[str] = None
    assigned_to_name: Optional[str] = None
    verified_by_name: Optional[str] = None
    source_file_path: Optional[str] = None
    source_file_name: Optional[str] = None
    source_mime_type: Optional[str] = None
    source_file_size: Optional[int] = None
    source_sha256: Optional[str] = None
    ocr_model: Optional[str] = None
    ocr_version: Optional[str] = None
    ocr_extracted_at: Optional[datetime] = None
    ocr_raw_json: Optional[dict] = None
    ocr_confidence_json: Optional[dict] = None
    human_verified_by_id: Optional[uuid.UUID] = None
    human_verified_at: Optional[datetime] = None
    human_verified_by_name: Optional[str] = None
    response_submitted_by_id: Optional[uuid.UUID] = None
    response_submitted_at: Optional[datetime] = None
    response_submitted_by_name: Optional[str] = None
    effectiveness_outcome: Optional[str] = None
    verified_at: Optional[datetime] = None
    reopened_by_id: Optional[uuid.UUID] = None
    reopened_at: Optional[datetime] = None
    reopen_reason: Optional[str] = None
    reopen_count: int = 0
    reopened_by_name: Optional[str] = None
    issued_at: Optional[datetime] = None
    acknowledged_at: Optional[datetime] = None
    in_progress_at: Optional[datetime] = None
    awaiting_verification_at: Optional[datetime] = None
    returned_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    voided_at: Optional[datetime] = None
    voided_by_id: Optional[uuid.UUID] = None
    voided_by_name: Optional[str] = None
    void_reason: Optional[str] = None
    verification_evidences: List[CARVerificationEvidenceResponse] = []
    is_overdue: bool = False
    days_overdue: int = 0

    class Config:
        from_attributes = True
