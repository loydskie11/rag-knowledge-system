from pydantic import BaseModel, EmailStr
from datetime import datetime
import uuid
from typing import Optional, List

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
    status: Optional[str] = "Active"
    created_at: datetime

    class Config:
        from_attributes = True

# What we send back when the user successfully logs in
class Token(BaseModel):
    access_token: str
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
    file_url: str
    uploaded_by: str
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
    sender_role: str = "FACULTY"
    recipient_name: Optional[str] = None
    recipient_email: Optional[str] = None
    recipient_role: Optional[str] = None
    origin_office: Optional[str] = None
    origin_person: Optional[str] = None
    current_location: Optional[str] = None
    transaction_type: Optional[str] = "Submission"
    remarks: Optional[str] = None
    file_url: Optional[str] = None

class PaperTrailRequestCreate(BaseModel):
    title: str
    document_type: str
    office: str
    target_person_name: str
    target_person_email: str
    instructions: Optional[str] = None

class PaperTrailFulfillRequest(BaseModel):
    file_url: str
    remarks: Optional[str] = None

class PaperTrailStatusUpdate(BaseModel):
    status: str # "Received", "Under Review", "Approved", "Needs Revision", "Forwarded", "Released"
    actor_name: str
    actor_email: str
    actor_role: str
    action_type: Optional[str] = "Acknowledge" # "Acknowledge", "Forward", "Return", "Approve"
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

class ISOEvidenceResponse(BaseModel):
    id: uuid.UUID
    iso_requirement_id: uuid.UUID
    document_name: str
    file_url: str
    uploaded_by: str
    upload_date: datetime

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
    cycle_year: str = "2025 Surveillance"
    auditee_office: str
    process_area: str
    opportunity_type: str = "Process"
    opportunity_description: str
    action_plan: str
    target_date: str
    personnel_responsible: str
    status: str = "In Progress"
    actual_completion_date: Optional[str] = None
    assessment_date: Optional[str] = None
    assessment_notes: Optional[str] = None

class QMSActionPlanUpdate(BaseModel):
    auditee_office: Optional[str] = None
    process_area: Optional[str] = None
    opportunity_type: Optional[str] = None
    opportunity_description: Optional[str] = None
    action_plan: Optional[str] = None
    target_date: Optional[str] = None
    personnel_responsible: Optional[str] = None
    status: Optional[str] = None
    actual_completion_date: Optional[str] = None
    assessment_date: Optional[str] = None
    assessment_notes: Optional[str] = None

class QMSActionPlanResponse(BaseModel):
    id: uuid.UUID
    cycle_year: str
    auditee_office: str
    process_area: str
    opportunity_type: str
    opportunity_description: str
    action_plan: str
    target_date: str
    personnel_responsible: str
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

    class Config:
        from_attributes = True

class ProgramAccreditationResponse(BaseModel):
    id: uuid.UUID
    program_code: str
    current_level: str
    status: str
    active_areas: Optional[str] = "Area I,Area II,Area III,Area IV,Area V,Area VI,Area VII,Area VIII,Area IX,Area X"
    valid_until: Optional[datetime] = None
    history: List[AccreditationHistoryResponse] = []

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