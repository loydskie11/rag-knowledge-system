export const CAMPUS_COLLEGES = [
  "College of Education (COEd)",
  "College of Arts and Sciences (CAS)",
  "College of Agriculture, Forestry, & Environmental Science (CAFES)",
  "College of Technology and Engineering (COTE)",
  "College of Hospitality and Tourism Management (CHTM)",
];

export const CAMPUS_PROGRAMS = [
  { code: "BEED", label: "Bachelor of Elementary Education (BEED)", college: CAMPUS_COLLEGES[0] },
  { code: "BSED_MATH", label: "BSEd major in Mathematics (BSEd-Math)", college: CAMPUS_COLLEGES[0] },
  { code: "BSED_ENGLISH", label: "BSEd major in English (BSEd-Eng)", college: CAMPUS_COLLEGES[0] },
  { code: "BTLED_HE", label: "BTLEd major in Home Economics (BTLEd-HE)", college: CAMPUS_COLLEGES[0] },
  { code: "AB_ELS", label: "BA in English Language Studies (AB-ELS)", college: CAMPUS_COLLEGES[1] },
  { code: "AB_LIT", label: "BA in Literature (AB-Lit)", college: CAMPUS_COLLEGES[1] },
  { code: "AB_PSYCH", label: "BA in Psychology (AB-Psych)", college: CAMPUS_COLLEGES[1] },
  { code: "BSF", label: "Bachelor of Science in Forestry (BSF)", college: CAMPUS_COLLEGES[2] },
  { code: "BSA", label: "Bachelor of Science in Agriculture (BSA)", college: CAMPUS_COLLEGES[2] },
  { code: "BSES", label: "Bachelor of Science in Environmental Science (BSES)", college: CAMPUS_COLLEGES[2] },
  { code: "BSIE", label: "BS in Industrial Engineering (BSIE)", college: CAMPUS_COLLEGES[3] },
  { code: "BSIT", label: "BS in Information Technology (BSIT)", college: CAMPUS_COLLEGES[3] },
  { code: "BIT_AT", label: "BIT major in Automotive Technology (BIT-AT)", college: CAMPUS_COLLEGES[3] },
  { code: "BIT_CT", label: "BIT major in Computer Technology (BIT-CT)", college: CAMPUS_COLLEGES[3] },
  { code: "BIT_DT", label: "BIT major in Drafting Technology (BIT-DT)", college: CAMPUS_COLLEGES[3] },
  { code: "BIT_ET", label: "BIT major in Electronics Technology (BIT-ET)", college: CAMPUS_COLLEGES[3] },
  { code: "BIT_GT", label: "BIT major in Garments Technology (BIT-GT)", college: CAMPUS_COLLEGES[3] },
  { code: "BSHM", label: "BS in Hospitality Management (BSHM)", college: CAMPUS_COLLEGES[4] },
  { code: "BSTM", label: "BS in Tourism Management (BSTM)", college: CAMPUS_COLLEGES[4] },
];

export const ACADEMIC_LEADERSHIP_ROLES = ["COLLEGE_DEAN", "PROGRAM_CHAIR", "COLLEGE_SECRETARY"] as const;

export function roleLabel(role: string) {
  return ({
    SYSTEM_ADMIN: "System Administrator",
    OFFICE_HEAD: "Office Head",
    COLLEGE_DEAN: "College Dean",
    PROGRAM_CHAIR: "Program Chair",
    COLLEGE_SECRETARY: "College Secretary",
    DOCUMENT_CONTROLLER: "Document Controller",
    FACULTY: "Faculty",
    STUDENT: "Student",
  } as Record<string, string>)[role] || role.replaceAll("_", " ");
}
