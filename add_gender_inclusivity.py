from docx import Document
from docx.oxml import OxmlElement
from docx.text.paragraph import Paragraph
from pathlib import Path

src = Path(r"C:\Projects\rag-governance\Evaluation-Questionnaire-RAG-Powered-Institutional-Knowledge-System-Revised.docx")
out = Path(r"C:\Projects\rag-governance\Evaluation-Questionnaire-RAG-Powered-Institutional-Knowledge-System-Gender-Inclusive.docx")
doc = Document(str(src))

def paras():
    return list(doc.paragraphs)

def find_exact(text):
    for p in paras():
        if p.text.strip() == text:
            return p
    raise ValueError(text)

def find_prefix(prefix):
    for p in paras():
        if p.text.strip().startswith(prefix):
            return p
    raise ValueError(prefix)

def set_text(p, text):
    for r in p.runs:
        r.text = ""
    if p.runs:
        p.runs[0].text = text
    else:
        p.add_run(text)

def insert_before(target, text):
    node = OxmlElement("w:p")
    target._p.addprevious(node)
    p = Paragraph(node, target._parent)
    p.add_run(text)
    return p

def replace_all(old, new):
    for p in paras():
        if old in p.text:
            full = p.text.replace(old, new)
            set_text(p, full)

def replace_tables(old, new):
    for t in doc.tables:
        for row in t.rows:
            for cell in row.cells:
                for p in cell.paragraphs:
                    if old in p.text:
                        set_text(p, p.text.replace(old, new))

# Make the purpose and privacy notice explicitly cover gender-inclusive evaluation.
purpose = find_prefix("This questionnaire evaluates the Campus-Wide RAG-Powered Institutional Knowledge System")
set_text(purpose, "This questionnaire evaluates the Campus-Wide RAG-Powered Institutional Knowledge System for Quality Assurance and Academic Governance at Cebu Technological University, Argao Campus. It is guided by the ISO/IEC 25010:2023 software quality model, the System Usability Scale (SUS), an adapted Technology Acceptance Model (TAM) instrument, RAG evaluation metrics, gender-inclusive design principles, and the study's specific functional objectives. Your feedback helps assess the system's effectiveness in supporting institutional efficiency, quality assurance, gender inclusivity, and compliance with the Data Privacy Act of 2012 (RA 10173).")
privacy = find_prefix("By taking part in this survey")
set_text(privacy, "By taking part in this survey, you consent to the collection and processing of your responses to evaluate the \"RAG-Powered Institutional Knowledge System for Quality Assurance and Academic Governance\" at CTU Argao Campus. In accordance with the Data Privacy Act of 2012 (Republic Act 10173), your responses will be kept confidential, stored securely on local encrypted drives, and used only for this academic study. Gender identity and pronouns are optional and will be reported only in aggregate form. They will not be shared with third parties or used for commercial purposes. Participation is voluntary: you may skip any question or withdraw at any time without penalty. Responses will be anonymized in the report and securely deleted after the study is completed. For privacy concerns, contact the research team through the official contact provided with this questionnaire.")

# Replace the non-inclusive gender options and add optional pronouns.
gender = find_exact("Gender (choose one)")
set_text(gender, "Gender Identity (optional; choose one)")
for p in paras():
    if p.text.strip() == "☐ LGBTQ+":
        set_text(p, "☐ Non-binary or gender-diverse")
        break
female = next(p for p in paras() if p.text.strip() == "☐ Female")
insert_before(find_exact("Base System Role (choose one)"), "☐ Prefer to self-describe: ______________________________")
insert_before(find_exact("Base System Role (choose one)"), "☐ Prefer not to say")
insert_before(find_exact("Base System Role (choose one)"), "")
insert_before(find_exact("Base System Role (choose one)"), "Pronouns (optional)")
insert_before(find_exact("Base System Role (choose one)"), "☐ She/her     ☐ He/him     ☐ They/them     ☐ Prefer to self-describe: __________________     ☐ Prefer not to say")

# Renumber the later sections to make room for the gender-inclusivity section.
replace_all("Part V. AskPolicy AI Evaluation (Retrieval, Faithfulness, Relevance)", "Part VI. AskPolicy AI Evaluation (Retrieval, Faithfulness, Relevance)")
replace_all("Part VI. Comments and Suggestions", "Part VII. Comments and Suggestions")

# Insert a dedicated gender-inclusivity section before the AI evaluation.
ai_heading = find_exact("Part VI. AskPolicy AI Evaluation (Retrieval, Faithfulness, Relevance)")
insert_before(ai_heading, "Part V. Gender-Inclusive System Design")
insert_before(ai_heading, "This part evaluates whether the system uses respectful, inclusive, privacy-conscious, and non-gender-assumptive design. If an item does not apply to your experience, mark N/A.")

table = doc.add_table(rows=1, cols=7)
headers = ["Statement", "5", "4", "3", "2", "1", "N/A"]
for i, h in enumerate(headers):
    table.rows[0].cells[i].text = h
items = [
    "1. The system uses respectful and inclusive language in its labels, instructions, and messages.",
    "2. The system does not assume a user's gender based on the user's name, role, office, or academic program.",
    "3. Gender-related information is optional and collected only when necessary.",
    "4. The system provides appropriate options for users with different gender identities.",
    "5. The system protects the confidentiality of gender-related information.",
    "6. I felt respected and included while using the system.",
]
for item in items:
    cells = table.add_row().cells
    cells[0].text = item
    for i in range(1, 7):
        cells[i].text = ""
ai_heading._p.addprevious(table._tbl)

doc.save(str(out))
print(out)
