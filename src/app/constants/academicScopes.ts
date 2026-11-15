export const PERSONNEL_ASSIGNMENT_TYPES = [
  "OFFICE_HEAD", "OFFICE_MEMBER", "COLLEGE_DEAN", "COLLEGE_SECRETARY",
  "PROGRAM_CHAIR", "FACULTY_MEMBER", "QA_HEAD", "IQA_AUDITOR",
  "SURVEY_ANALYST", "DOCUMENT_CONTROLLER",
] as const;

export const ASSIGNMENT_SCOPE: Record<string, "CAMPUS" | "OFFICE" | "COLLEGE" | "PROGRAM"> = {
  OFFICE_HEAD: "OFFICE", OFFICE_MEMBER: "OFFICE", COLLEGE_DEAN: "COLLEGE",
  COLLEGE_SECRETARY: "COLLEGE", PROGRAM_CHAIR: "PROGRAM", FACULTY_MEMBER: "PROGRAM",
  QA_HEAD: "CAMPUS", IQA_AUDITOR: "CAMPUS", SURVEY_ANALYST: "OFFICE",
  DOCUMENT_CONTROLLER: "CAMPUS",
};

export const ACADEMIC_LEADERSHIP_ROLES = ["COLLEGE_DEAN", "PROGRAM_CHAIR", "COLLEGE_SECRETARY"] as const;

export function roleLabel(role: string) {
  return ({
    SYSTEM_ADMIN: "System Administrator",
    PERSONNEL: "Personnel",
    OFFICE_HEAD: "Office Head",
    COLLEGE_DEAN: "College Dean",
    PROGRAM_CHAIR: "Program Chair",
    COLLEGE_SECRETARY: "College Secretary",
    DOCUMENT_CONTROLLER: "Document Controller",
    FACULTY: "Faculty",
    STUDENT: "Student",
  } as Record<string, string>)[role] || role.replaceAll("_", " ");
}

export function assignmentLabel(type: string) {
  return ({
    OFFICE_HEAD: "Office Head", OFFICE_MEMBER: "Office Member", COLLEGE_DEAN: "College Dean",
    COLLEGE_SECRETARY: "College Secretary", PROGRAM_CHAIR: "Program Chair",
    FACULTY_MEMBER: "Faculty Member / Instructor", QA_HEAD: "Quality Assurance Head",
    IQA_AUDITOR: "Internal Quality Auditor", SURVEY_ANALYST: "Survey Analyst",
    DOCUMENT_CONTROLLER: "Document Controller",
  } as Record<string, string>)[type] || type.replaceAll("_", " ");
}
