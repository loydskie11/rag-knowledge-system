import sys

with open("c:/Projects/rag-governance/backend/models.py", "a", encoding="utf-8") as f:
    f.write("""
class CARForm(Base):
    __tablename__ = "car_forms"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cycle_year = Column(String(50), default="2025 Surveillance", nullable=False)
    car_no = Column(String(100), nullable=True)
    date_issued = Column(String(50), nullable=True)
    revision = Column(String(50), nullable=True)
    finding_category = Column(String(50), default="UNKNOWN")
    type_of_non_conformity = Column(String(255), nullable=True)
    auditor_name = Column(String(255), nullable=True)
    acknowledged_by = Column(String(255), nullable=True)
    campus = Column(String(255), nullable=True)
    area = Column(String(255), nullable=True)
    findings = Column(Text, nullable=True)
    root_cause = Column(Text, nullable=True)
    immediate_action = Column(Text, nullable=True)
    corrective_measure = Column(Text, nullable=True)
    status = Column(String(50), default="Open")
    created_at = Column(DateTime, default=datetime.utcnow)
""")
print("Added CARForm to models.py")
