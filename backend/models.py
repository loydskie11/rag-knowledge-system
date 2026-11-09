from sqlalchemy import Column, String, Text, DateTime, Date, Boolean, ForeignKey, Integer, BigInteger, Float, UniqueConstraint, CheckConstraint, Index, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String(255), nullable=True)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(Text, nullable=False)
    role = Column(String(50), default="STUDENT")
    department = Column(String(255), nullable=True)
    administrative_office = Column(String(255), nullable=True)
    is_iqa_auditor = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    created_by_admin = Column(Boolean, default=False)
    email_changed = Column(Boolean, default=False)
    status = Column(String(50), default="Active")
    created_at = Column(DateTime, default=datetime.utcnow)

    student_profile = relationship("StudentProfile", back_populates="user", uselist=False)
    assignments = relationship("UserAssignment", back_populates="user", cascade="all, delete-orphan")


class OrganizationalUnit(Base):
    __tablename__ = "organizational_units"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(80), unique=True, nullable=False)
    name = Column(String(255), unique=True, nullable=False)
    unit_type = Column(String(30), nullable=False)  # OFFICE or COLLEGE
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class AcademicProgram(Base):
    __tablename__ = "academic_programs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    college_unit_id = Column(UUID(as_uuid=True), ForeignKey("organizational_units.id", ondelete="RESTRICT"), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    college = relationship("OrganizationalUnit")


class UserAssignment(Base):
    __tablename__ = "user_assignments"
    __table_args__ = (
        UniqueConstraint("user_id", "assignment_type", "scope_type", "scope_id", name="uq_user_assignment_scope"),
    )
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    assignment_type = Column(String(60), nullable=False)
    scope_type = Column(String(30), nullable=False)  # CAMPUS, OFFICE, COLLEGE, PROGRAM
    scope_id = Column(UUID(as_uuid=True), nullable=True)
    is_primary = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    user = relationship("User", back_populates="assignments")


class ISOProcessGroup(Base):
    __tablename__ = "iso_process_groups"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(80), unique=True, nullable=False)
    name = Column(String(255), unique=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)


class ISOProcessUnitMapping(Base):
    __tablename__ = "iso_process_unit_mappings"
    __table_args__ = (
        UniqueConstraint("process_group_id", "organizational_unit_id", name="uq_iso_process_unit"),
    )
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    process_group_id = Column(UUID(as_uuid=True), ForeignKey("iso_process_groups.id", ondelete="CASCADE"), nullable=False)
    organizational_unit_id = Column(UUID(as_uuid=True), ForeignKey("organizational_units.id", ondelete="CASCADE"), nullable=False)


class ISOProcessAlias(Base):
    __tablename__ = "iso_process_aliases"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    process_group_id = Column(UUID(as_uuid=True), ForeignKey("iso_process_groups.id", ondelete="CASCADE"), nullable=False)
    alias = Column(String(255), unique=True, nullable=False)

class StudentProfile(Base):
    __tablename__ = "student_profiles"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    course = Column(String(255), nullable=True)
    year_level = Column(String(50), nullable=True)

    user = relationship("User", back_populates="student_profile")


class DocumentUpload(Base):
    """One file-level registry row; document_sections stores its vector chunks."""
    __tablename__ = "document_uploads"
    __table_args__ = (
        CheckConstraint("file_size >= 0", name="document_uploads_file_size_nonnegative"),
        CheckConstraint("file_sha256 ~ '^[0-9a-f]{64}$'", name="document_uploads_sha256_format"),
        CheckConstraint(
            "upload_mode in ('NEW_DOCUMENT', 'NEW_VERSION', 'LEGACY_BACKFILL')",
            name="document_uploads_upload_mode_valid",
        ),
        CheckConstraint(
            "status in ('PROCESSING', 'ACTIVE', 'SUPERSEDED', 'ARCHIVED', 'FAILED')",
            name="document_uploads_status_valid",
        ),
        CheckConstraint(
            "scope_type in ('CAMPUS', 'OFFICE', 'PROGRAM')",
            name="document_uploads_scope_type_valid",
        ),
        Index(
            "uq_document_uploads_hash_scope",
            "file_sha256",
            "scope_key",
            unique=True,
            postgresql_where=text("status <> 'FAILED'"),
        ),
        Index(
            "idx_document_uploads_name_scope",
            "normalized_name",
            "scope_key",
            postgresql_where=text("status <> 'FAILED'"),
        ),
    )
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    file_sha256 = Column(String(64), nullable=False)
    file_size = Column(BigInteger, nullable=False)
    original_filename = Column(Text, nullable=False)
    document_name = Column(Text, nullable=False)
    normalized_name = Column(Text, nullable=False)
    category = Column(Text, nullable=False)
    office = Column(Text, nullable=False)
    program = Column(Text, default="GLOBAL", nullable=False)
    scope_type = Column(String(20), nullable=False)
    scope_code = Column(Text, nullable=False)
    scope_key = Column(Text, nullable=False)
    version = Column(Text, nullable=False)
    upload_mode = Column(String(30), default="NEW_DOCUMENT", nullable=False)
    status = Column(String(30), default="PROCESSING", nullable=False)
    storage_path = Column(Text, nullable=True)
    job_id = Column(UUID(as_uuid=True), nullable=True)
    uploaded_by = Column(Text, nullable=False)
    failure_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)

# --- NEW: OTP VERIFICATION TABLE ---
class OTPVerification(Base):
    __tablename__ = "otp_verifications"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    otp_code = Column(String(6), nullable=False)
    expires_at = Column(DateTime, nullable=False)

# --- NEW: ANNOUNCEMENT TABLE ---
class Announcement(Base):
    __tablename__ = "announcements"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    recipients = Column(String(255), nullable=False) 
    sent_date = Column(DateTime, default=datetime.utcnow)
    sent_by = Column(String(255), nullable=False)
    status = Column(String(50), default="Sent") # Sent, Scheduled, Draft
    read_count = Column(Integer, default=0)
    total_recipients = Column(Integer, default=0)

# --- NEW: SYSTEM SETTINGS TABLE ---
class SystemSettings(Base):
    __tablename__ = "system_settings"
    id = Column(Integer, primary_key=True, index=True, default=1) # Always ID 1
    
    # Profile Settings
    platform_name = Column(String(255), default="CTU Institutional Knowledge System")
    campus = Column(String(255), default="Argao Campus")
    admin_email = Column(String(255), default="admin@ctu.edu.ph")
    
    # Security Settings
    jwt_expiration = Column(Integer, default=30)
    otp_expiration = Column(Integer, default=10)
    
    # AI Engine Settings
    ai_model = Column(String(100), default="qwen2.5")
    ai_temperature = Column(Float, default=0.3)
    ai_system_prompt = Column(Text, default="You are the friendly and professional AI Policy Assistant for Cebu Technological University (CTU) Argao Campus. INSTRUCTIONS: 1. If the question is about university rules, grades, or handbooks, use the CONTEXT provided below to answer. 2. If NO CONTEXT is found, apologize and direct them to the campus office.")
    rag_max_chunks = Column(Integer, default=5)

# --- NEW: CHED MONITORING TABLES ---
class ChedRequirement(Base):
    __tablename__ = "ched_requirements"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    program = Column(String(255), nullable=False) # e.g., "BSIT"
    cmo_name = Column(String(255), nullable=False) # e.g., "CMO 25 series of 2015"
    description = Column(Text, nullable=False) # The actual rule/requirement
    status = Column(String(50), default="Not Compliant") # Compliant, Pending, Not Compliant

    evidences = relationship("ChedEvidence", back_populates="requirement", cascade="all, delete-orphan")

class ChedEvidence(Base):
    __tablename__ = "ched_evidences"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    requirement_id = Column(UUID(as_uuid=True), ForeignKey("ched_requirements.id", ondelete="CASCADE"))
    document_name = Column(String(255), nullable=False)
    file_name = Column(String(255), nullable=True)
    storage_path = Column(String, nullable=True)
    file_url = Column(String, nullable=False)
    uploaded_by = Column(String(255), nullable=False)
    status = Column(String(50), default="Pending Verification")
    upload_date = Column(DateTime, default=datetime.utcnow)

    requirement = relationship("ChedRequirement", back_populates="evidences")


# --- NEW: PAPER TRAIL (RECEIVING & RELEASING HISTORY) TABLES ---
class PaperTrailRecord(Base):
    __tablename__ = "paper_trail_records"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tracking_number = Column(String(50), unique=True, nullable=False, index=True) # e.g. "PT-2026-1001"
    title = Column(String(255), nullable=False)
    document_type = Column(String(100), nullable=False) # Syllabus, Clearance, Transmittal, Grade Sheet, Report, etc.
    office = Column(String(255), nullable=False) # Target Office e.g. "Academic Affairs", "Dean's Office", "Registrar"
    sender_name = Column(String(255), nullable=False)
    sender_email = Column(String(255), nullable=False)
    sender_role = Column(String(50), default="PERSONNEL")
    recipient_name = Column(String(255), nullable=True)
    recipient_email = Column(String(255), nullable=True)
    recipient_role = Column(String(50), nullable=True)
    status = Column(String(50), default="Pending Receiving") # Pending Receiving, Received, Under Review, Approved, Needs Revision, Released
    origin_office = Column(String(255), nullable=True)
    origin_person = Column(String(255), nullable=True)
    current_location = Column(String(255), nullable=True)
    transaction_type = Column(String(50), default="Submission") # Submission (bottom-up) or Request (top-down)
    is_controlled_document = Column(Boolean, default=False) # Policies/manuals/procedures/forms requiring controller release
    remarks = Column(Text, nullable=True)
    storage_path = Column(String, nullable=True)
    file_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    logs = relationship("PaperTrailLog", back_populates="record", cascade="all, delete-orphan", order_by="PaperTrailLog.timestamp.desc()")


class PaperTrailLog(Base):
    __tablename__ = "paper_trail_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    record_id = Column(UUID(as_uuid=True), ForeignKey("paper_trail_records.id", ondelete="CASCADE"), nullable=False)
    action = Column(String(100), nullable=False) # Document Released, Received by Office, Approved, Returned for Revision, etc.
    status = Column(String(50), nullable=False)
    actor_name = Column(String(255), nullable=False)
    actor_email = Column(String(255), nullable=False)
    actor_role = Column(String(50), nullable=False)
    notes = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    record = relationship("PaperTrailRecord", back_populates="logs")


class ISORequirement(Base):
    __tablename__ = "iso_requirements"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    program = Column(String(50), nullable=False) # e.g. BSIT, BEED, BSED_MATH
    iso_clause = Column(String(100), nullable=False) # e.g. Clause 6.1, Clause 7.1.5.2, Clause 8.1 & 8.5
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    auditee_office = Column(String(255), nullable=False) # e.g. Director of Instruction, HRMO, Registrar, Finance, BAC, SAO, Document Controller, Library Services
    risk_level = Column(String(20), default="Medium") # High, Medium, Low
    status = Column(String(50), default="Not Compliant") # Compliant, Pending, Not Compliant
    cycle_year = Column(String(50), default="2025 Surveillance", nullable=False) # e.g. 2024 Initial Audit, 2025 Surveillance, 2026 Recertification
    created_at = Column(DateTime, default=datetime.utcnow)

    evidences = relationship("ISOEvidence", back_populates="requirement", cascade="all, delete-orphan")
    car_forms = relationship("CARForm", backref="iso_requirement", lazy="joined")


class ISOAuditCycle(Base):
    __tablename__ = "iso_audit_cycles"
    __table_args__ = (
        CheckConstraint("status in ('PLANNED', 'ACTIVE', 'CLOSED')", name="iso_audit_cycles_status_valid"),
    )
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    standard_version = Column(String(100), default="ISO 9001:2015", nullable=False)
    status = Column(String(20), default="ACTIVE", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    results = relationship("ISOAuditResult", back_populates="cycle", cascade="all, delete-orphan")


class ISOAuditResult(Base):
    __tablename__ = "iso_audit_results"
    __table_args__ = (
        CheckConstraint(
            "result_type in ('INTERNAL_AUDIT', 'CERTIFICATION_AUDIT', 'SURVEILLANCE_AUDIT', 'RECERTIFICATION_AUDIT', 'OTHER_EXTERNAL')",
            name="iso_audit_results_type_valid",
        ),
        CheckConstraint("record_status in ('DRAFT', 'FINALIZED')", name="iso_audit_results_status_valid"),
        CheckConstraint(
            "certification_status is null or certification_status in ('CERTIFIED', 'MAINTAINED', 'RECOMMENDED', 'SUSPENDED', 'WITHDRAWN', 'NOT_CERTIFIED')",
            name="iso_audit_results_certification_status_valid",
        ),
        CheckConstraint(
            "major_nonconformities >= 0 and minor_nonconformities >= 0 and observations >= 0 and opportunities_for_improvement >= 0",
            name="iso_audit_results_counts_nonnegative",
        ),
        Index("idx_iso_audit_results_cycle_date", "cycle_id", "audit_end_date"),
    )
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cycle_id = Column(UUID(as_uuid=True), ForeignKey("iso_audit_cycles.id", ondelete="RESTRICT"), nullable=False)
    result_type = Column(String(40), nullable=False)
    audit_start_date = Column(DateTime, nullable=True)
    audit_end_date = Column(DateTime, nullable=False)
    auditor_or_certification_body = Column(String(255), nullable=False)
    conclusion = Column(String(255), nullable=False)
    certification_status = Column(String(30), nullable=True)
    major_nonconformities = Column(Integer, default=0, nullable=False)
    minor_nonconformities = Column(Integer, default=0, nullable=False)
    observations = Column(Integer, default=0, nullable=False)
    opportunities_for_improvement = Column(Integer, default=0, nullable=False)
    summary = Column(Text, nullable=False)
    report_storage_path = Column(Text, nullable=True)
    report_original_filename = Column(String(500), nullable=True)
    certificate_storage_path = Column(Text, nullable=True)
    certificate_original_filename = Column(String(500), nullable=True)
    record_status = Column(String(20), default="DRAFT", nullable=False)
    created_by = Column(String(255), nullable=False)
    finalized_by = Column(String(255), nullable=True)
    finalized_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    cycle = relationship("ISOAuditCycle", back_populates="results")


class ISOEvidence(Base):
    __tablename__ = "iso_evidences"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    iso_requirement_id = Column(UUID(as_uuid=True), ForeignKey("iso_requirements.id", ondelete="CASCADE"), nullable=False)
    document_name = Column(String(255), nullable=False)
    storage_path = Column(String, nullable=True)
    file_url = Column(String, nullable=False)
    uploaded_by = Column(String(255), nullable=False)
    upload_date = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default="Pending")
    admin_feedback = Column(Text, nullable=True) # NEW: Auditor assessment remarks

    requirement = relationship("ISORequirement", back_populates="evidences")


class IQASchedule(Base):
    __tablename__ = "iqa_schedules"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    program = Column(String(50), nullable=False, unique=True)
    academic_year = Column(String(50), default="IQA Audit Cycle 2025-2026")
    day1_date = Column(String(100), default="Sept 10, 2025")
    day1_title = Column(String(255), default="Context, Risk & Resource Audit")
    day1_scope = Column(Text, default="On-site clause audit of Director of Instruction (DOI), College Deans, Financial Management, Property Custodian & SAO. Audit of Clauses 6.1, 7.1 & 8.5.")
    day2_date = Column(String(100), default="Sept 11, 2025")
    day2_title = Column(String(255), default="HR, Data Systems & External Control")
    day2_scope = Column(Text, default="Audit of HRMO (Clause 7.2), Registrar & MIS (Clause 9.1), Document Controller (Clause 7.5), Library, and BAC Procurement (Clause 8.4).")
    day3_date = Column(String(100), default="Sept 12, 2025")
    day3_title = Column(String(255), default="Consolidation & Closing Meeting")
    day3_scope = Column(Text, default="Internal data cross-referencing, synthesis of observations, drafting the formal audit findings report, and the official closing meeting and findings presentation.")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class IQADaySchedule(Base):
    __tablename__ = "iqa_day_schedules"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    program = Column(String(50), default="GLOBAL")
    cycle_year = Column(String(50), default="2025 Surveillance", nullable=False)
    day_number = Column(Integer, nullable=False)
    day_date = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    scope = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class QMSActionPlan(Base):
    __tablename__ = "qms_action_plans"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cycle_year = Column(String(50), default="2025 Surveillance", nullable=False)
    auditee_office = Column(String(255), nullable=False)
    process_area = Column(String(255), nullable=False)
    opportunity_type = Column(String(50), default="Process") # Process, People, Paper, Risk/Opportunity
    findings = Column(Text, nullable=False)
    root_cause = Column(Text, nullable=True)
    immediate_action = Column(Text, nullable=True)
    corrective_measure = Column(Text, nullable=False)
    target_date = Column(String(50), nullable=False)
    personnel_responsible = Column(String(255), nullable=False)
    status = Column(String(50), default="In Progress") # Proposed, In Progress, Completed, Overdue
    actual_completion_date = Column(String(50), nullable=True) # e.g. "2025-09-10"
    assessment_date = Column(String(50), nullable=True) # e.g. "2025-09-12"
    assessment_notes = Column(Text, nullable=True) # Auditor/Lead remarks
    created_by = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    evidences = relationship("QMSEvidence", back_populates="action_plan", cascade="all, delete-orphan")


class QMSEvidence(Base):
    __tablename__ = "qms_evidences"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    action_plan_id = Column(UUID(as_uuid=True), ForeignKey("qms_action_plans.id", ondelete="CASCADE"), nullable=False)
    document_name = Column(String(255), nullable=False)
    storage_path = Column(String, nullable=True)
    file_url = Column(String, nullable=False)
    uploaded_by = Column(String(255), nullable=False)
    upload_date = Column(DateTime, default=datetime.utcnow)

    action_plan = relationship("QMSActionPlan", back_populates="evidences")


# --- NEW: PROGRAM ACCREDITATION TABLES ---
class ProgramAccreditation(Base):
    __tablename__ = "program_accreditations"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    program_code = Column(String(50), unique=True, nullable=False) # e.g. "BSIT"
    current_level = Column(String(100), default="Level I") # e.g. "Level II Re-accredited"
    status = Column(String(50), default="Active") # Active, Under Assessment, Expired
    active_areas = Column(String(500), default="Area I,Area II,Area III,Area IV,Area V,Area VI,Area VII,Area VIII,Area IX,Area X")
    valid_until = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    history = relationship("AccreditationHistory", back_populates="program", cascade="all, delete-orphan", order_by="AccreditationHistory.date_granted.desc()")
    cycles = relationship("AccreditationCycle", back_populates="program", cascade="all, delete-orphan", order_by="AccreditationCycle.opened_at.desc()")

    @property
    def active_cycle(self):
        return next((cycle for cycle in self.cycles if cycle.status == "ACTIVE"), None)

class AccreditationHistory(Base):
    __tablename__ = "accreditation_history"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    program_id = Column(UUID(as_uuid=True), ForeignKey("program_accreditations.id", ondelete="CASCADE"), nullable=False)
    level_achieved = Column(String(100), nullable=False)
    date_granted = Column(DateTime, default=datetime.utcnow)
    valid_until = Column(DateTime, nullable=True)
    certificate_storage_path = Column(String, nullable=True)
    certificate_url = Column(String, nullable=True)
    remarks = Column(Text, nullable=True)
    cycle_id = Column(UUID(as_uuid=True), ForeignKey("accreditation_cycles.id", ondelete="SET NULL"), nullable=True)

    program = relationship("ProgramAccreditation", back_populates="history")
    cycle = relationship("AccreditationCycle", foreign_keys=[cycle_id], uselist=False)


class AccreditationCycle(Base):
    __tablename__ = "accreditation_cycles"
    __table_args__ = (
        UniqueConstraint("program_id", "level_name", "attempt_number", name="accreditation_cycles_program_level_attempt_key"),
        CheckConstraint("attempt_number > 0", name="accreditation_cycles_attempt_number_check"),
        CheckConstraint("status IN ('ACTIVE', 'CLOSED')", name="accreditation_cycles_status_check"),
        CheckConstraint("source IN ('LEGACY_HISTORY', 'LEGACY_BASELINE', 'LEVEL_TRANSITION', 'ADMINISTRATIVE_BASELINE')", name="accreditation_cycles_source_check"),
        CheckConstraint("(status = 'ACTIVE' AND closed_at IS NULL) OR (status = 'CLOSED' AND closed_at IS NOT NULL)", name="accreditation_cycles_closed_state"),
        Index("idx_accreditation_cycles_program_status", "program_id", "status"),
        Index("uq_accreditation_cycles_one_active_program", "program_id", unique=True, postgresql_where=text("status = 'ACTIVE'")),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    program_id = Column(UUID(as_uuid=True), ForeignKey("program_accreditations.id", ondelete="CASCADE"), nullable=False)
    level_name = Column(String(100), nullable=False)
    attempt_number = Column(Integer, nullable=False, default=1, server_default=text("1"))
    cycle_label = Column(String(255), nullable=False)
    status = Column(String(20), nullable=False, default="ACTIVE", server_default=text("'ACTIVE'"))
    source = Column(String(40), nullable=False, default="LEVEL_TRANSITION", server_default=text("'LEVEL_TRANSITION'"))
    opened_at = Column(DateTime, nullable=False, default=datetime.utcnow, server_default=text("now()"))
    closed_at = Column(DateTime, nullable=True)
    valid_until = Column(DateTime, nullable=True)
    source_history_id = Column(UUID(as_uuid=True), ForeignKey("accreditation_history.id", ondelete="SET NULL"), unique=True, nullable=True)
    created_by = Column(String(255), nullable=False)
    closed_by = Column(String(255), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, server_default=text("now()"))
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow, server_default=text("now()"))

    program = relationship("ProgramAccreditation", back_populates="cycles")
    source_history = relationship("AccreditationHistory", foreign_keys=[source_history_id], uselist=False)


class AaccupRequirement(Base):
    __tablename__ = "aaccup_requirements"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    area_code = Column(String(50), nullable=False) # e.g., "Area I"
    area_title = Column(String(255), nullable=False) # e.g., "Vision, Mission, Goals and Objectives"
    description = Column(Text, nullable=False) # e.g., "Approved Board Resolution of VMGO"
    created_at = Column(DateTime, default=datetime.utcnow)


class CssResponse(Base):
    __tablename__ = "css_responses"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime, default=datetime.utcnow)
    survey_year = Column(Integer, nullable=True, index=True)
    survey_date = Column(Date, nullable=True, index=True)
    client_type = Column(String(100), nullable=True)
    date_of_service = Column(String(50), nullable=True)
    gender = Column(String(50), nullable=True)
    age = Column(Integer, nullable=True)
    region = Column(String(150), nullable=True)
    service_availed = Column(String(255), nullable=True)
    campus = Column(String(100), nullable=True)
    office_visited = Column(String(150), nullable=True)
    office_other = Column(String(255), nullable=True)
    cc1 = Column(Text, nullable=True)
    cc2 = Column(Text, nullable=True)
    cc3 = Column(Text, nullable=True)
    sqd0 = Column(String(100), nullable=True)
    sqd1 = Column(String(100), nullable=True)
    sqd2 = Column(String(100), nullable=True)
    sqd3 = Column(String(100), nullable=True)
    sqd4 = Column(String(100), nullable=True)
    sqd5 = Column(String(100), nullable=True)
    sqd6 = Column(String(100), nullable=True)
    sqd7 = Column(String(100), nullable=True)
    sqd8 = Column(String(100), nullable=True)
    suggestions = Column(Text, nullable=True)
    full_name = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)

class CARForm(Base):
    __tablename__ = "car_forms"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cycle_year = Column(String(50), default="2025 Surveillance", nullable=False)
    iso_clause_id = Column(UUID(as_uuid=True), ForeignKey("iso_requirements.id", ondelete="SET NULL"), nullable=True)
    car_no = Column(String(100), nullable=True)
    date_issued = Column(String(50), nullable=True)
    revision = Column(String(50), nullable=True)
    finding_category = Column(String(50), default="UNKNOWN")
    type_of_non_conformity = Column(String(255), nullable=True)
    auditor_name = Column(String(255), nullable=True)
    initiator = Column(String(255), nullable=True)
    acknowledged_by = Column(String(255), nullable=True)
    campus = Column(String(255), nullable=True)
    area = Column(String(255), nullable=True)
    findings = Column(Text, nullable=True)
    root_cause = Column(Text, nullable=True)
    immediate_action = Column(Text, nullable=True)
    corrective_measure = Column(Text, nullable=True)
    measures_proposed_by = Column(String(255), nullable=True)
    target_date = Column(String(50), nullable=True)
    status = Column(String(50), default="Open")
    follow_up_result = Column(String(255), nullable=True)
    follow_up_date = Column(String(50), nullable=True)
    comments_remarks = Column(Text, nullable=True)
    non_conformity_closed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
