from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.text.paragraph import Paragraph
from pathlib import Path

src = Path(r"C:\Users\Admin\Downloads\Evaluation-Questionnaire-RAG-Powered-Institutional-Knowledge-System-for-Quality-1.docx")
out = Path(r"C:\Projects\rag-governance\Evaluation-Questionnaire-RAG-Powered-Institutional-Knowledge-System-Revised.docx")

doc = Document(str(src))

def all_paragraphs():
    return list(doc.paragraphs)

def find_paragraph(text):
    for p in all_paragraphs():
        if p.text.strip() == text:
            return p
    raise ValueError(f"Paragraph not found: {text}")

def find_paragraph_prefix(prefix):
    for p in all_paragraphs():
        if p.text.strip().startswith(prefix):
            return p
    raise ValueError(f"Paragraph prefix not found: {prefix}")

def remove_paragraph(p):
    el = p._element
    el.getparent().remove(el)

def insert_paragraph_before(target, text, style=None):
    new_p = OxmlElement("w:p")
    target._p.addprevious(new_p)
    p = Paragraph(new_p, target._parent)
    if style:
        p.style = style
    p.add_run(text)
    return p

def replace_in_paragraphs(old, new):
    for p in all_paragraphs():
        if old in p.text:
            for r in p.runs:
                if old in r.text:
                    r.text = r.text.replace(old, new)
            if old in p.text:
                # Fallback for text split across runs.
                full = p.text.replace(old, new)
                for r in p.runs:
                    r.text = ""
                if p.runs:
                    p.runs[0].text = full
                else:
                    p.add_run(full)

def replace_in_tables(old, new):
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for p in cell.paragraphs:
                    if old in p.text:
                        full = p.text.replace(old, new)
                        for r in p.runs:
                            r.text = ""
                        if p.runs:
                            p.runs[0].text = full
                        else:
                            p.add_run(full)

def set_paragraph_text(p, text):
    for r in p.runs:
        r.text = ""
    if p.runs:
        p.runs[0].text = text
    else:
        p.add_run(text)

# Purpose and privacy language.
replace_in_paragraphs(
    "the System Usability Scale (SUS), perceived usefulness and ease of use, the RAG Triad computational metrics,",
    "the System Usability Scale (SUS), an adapted Technology Acceptance Model (TAM) instrument, and RAG evaluation metrics,"
)
set_paragraph_text(
    find_paragraph_prefix("This questionnaire evaluates the Campus-Wide RAG-Powered Institutional Knowledge System"),
    "This questionnaire evaluates the Campus-Wide RAG-Powered Institutional Knowledge System for Quality Assurance and Academic Governance at Cebu Technological University, Argao Campus. It is guided by the ISO/IEC 25010:2023 software quality model, the System Usability Scale (SUS), an adapted Technology Acceptance Model (TAM) instrument, RAG evaluation metrics, and the study's specific functional objectives. Your feedback helps assess the system's effectiveness in supporting institutional efficiency, quality assurance, and compliance with the Data Privacy Act of 2012 (RA 10173)."
)
replace_in_paragraphs(
    "For privacy concerns, contact the research team at [research team email].",
    "For privacy concerns, contact the research team through the official contact provided with this questionnaire."
)

# Replace the old role list with the three base system roles and Personnel assignments.
role_heading = find_paragraph("Role (choose one)")
modules_heading = find_paragraph("Modules you used before answering (check all that apply)")
paras = all_paragraphs()
start = next(i for i, p in enumerate(paras) if p._p is role_heading._p)
end = next(i for i, p in enumerate(paras) if p._p is modules_heading._p)
for p in paras[start + 1:end]:
    remove_paragraph(p)
for r in role_heading.runs:
    r.text = ""
role_heading.add_run("Base System Role (choose one)")
new_role_lines = [
    "☐ System Administrator",
    "☐ Personnel",
    "☐ Student",
    "",
    "If you selected Personnel, select all applicable Personnel assignments:",
    "☐ Office Head",
    "☐ Office Member",
    "☐ College Dean",
    "☐ College Secretary",
    "☐ Program Chair",
    "☐ Faculty Member/Instructor",
    "☐ QA Head",
    "☐ IQA Auditor",
    "☐ Document Controller",
    "☐ Survey Analyst",
    "☐ Other: ______________________________",
]
for line in new_role_lines:
    insert_paragraph_before(modules_heading, line)

# Clarify module selection and exposure.
for r in modules_heading.runs:
    r.text = ""
modules_heading.add_run("Modules Used Before Answering (check all that apply)")
insert_paragraph_before(
    modules_heading,
    "Please answer only the evaluation sections for modules you actually used. System Administrator and technical evaluators should also complete the technical evaluation items that apply to their assigned tasks."
)

# ISO/IEC 25010:2023 naming consistency.
replace_in_tables("D. Usability", "D. Interaction Capability")
replace_in_tables("H. Portability", "H. Flexibility")

# Make Part IV explicitly TAM and add behavioral intention items.
replace_in_paragraphs("Part IV. Perceived Usefulness and Ease of Use", "Part IV. Technology Acceptance Model (TAM)")
replace_in_paragraphs(
    "Scale: 5 Strongly Agree | 4 Agree | 3 Neutral | 2 Disagree | 1 Strongly Disagree",
    "Scale: 5 Strongly Agree | 4 Agree | 3 Neutral | 2 Disagree | 1 Strongly Disagree"
)
tam_heading = find_paragraph("Part IV. Technology Acceptance Model (TAM)")
insert_paragraph_before(
    find_paragraph("Part V. AskPolicy AI Evaluation (Retrieval, Faithfulness, Relevance)"),
    "This part measures perceived usefulness, perceived ease of use, and behavioral intention to use the system. These are the core user-acceptance constructs of the adapted Technology Acceptance Model (TAM). Please answer based on the system functions you actually used.",
)

replace_in_tables("Perceived Usefulness", "Perceived Usefulness (TAM)")
replace_in_tables("Perceived Ease of Use", "Perceived Ease of Use (TAM)")

part_v = find_paragraph("Part V. AskPolicy AI Evaluation (Retrieval, Faithfulness, Relevance)")
table = doc.add_table(rows=1, cols=6)
hdr = table.rows[0].cells
for i, value in enumerate(["Behavioral Intention to Use (TAM)", "5", "4", "3", "2", "1"]):
    hdr[i].text = value
for statement in [
    "1. I intend to use the system when it is available for tasks related to my role.",
    "2. I expect to use the system regularly for relevant academic or administrative tasks.",
    "3. I would recommend the system to other intended users.",
]:
    cells = table.add_row().cells
    cells[0].text = statement
    for i in range(1, 6):
        cells[i].text = ""
part_v._p.addprevious(table._tbl)

# Improve AI evaluation instructions and distinguish questionnaire evidence from formal benchmarking.
replace_in_paragraphs(
    "This part measures the quality of the AI's answers. Open the Ask Policy chat and ask three real questions about CTU policies you know well (for example, from the Student Handbook, the Faculty Manual, or a CHED Memorandum Order). Write each question below, then evaluate the answer using your own knowledge of the policy.",
    "This part measures the perceived quality of the AI's answers. Open the Ask Policy chat and ask three assigned or approved questions about CTU policies (for example, from the Student Handbook, the Faculty Manual, or a CHED Memorandum Order). Write each question below, then evaluate the answer using the cited documents and your knowledge of the policy. Formal retrieval metrics should be computed separately using a fixed benchmark set with expert-labeled relevant document chunks."
)
replace_in_paragraphs("A. Context Retrieval Accuracy (Top K = 5) (IT Experts / Technical Evaluators only). Count the document chunks retrieved from Supabase pgvector for each query.", "A. Context Retrieval Evaluation (Top K = 5) (System Administrators, IT Experts, or Technical Evaluators only). Record the number of retrieved chunks that are relevant to each query. The formal benchmark may be used to calculate Precision@5, Recall@5, and F1@5.")
replace_in_paragraphs("B. Answer faithfulness (all evaluators). Is the answer based only on the cited CTU documents? Mark one box per query.", "B. Answer Faithfulness (evaluators who used AskPolicy). Is the answer supported by the cited CTU documents? Mark one box per query.")
replace_in_paragraphs("C. Answer relevance (all evaluators). Did the answer address your question without off-topic or unnecessary information?", "C. Answer Relevance (evaluators who used AskPolicy). Did the answer address your question without off-topic or unnecessary information?")

# Change table labels to reflect the revised terminology.
replace_in_tables("Chunks retrieved (K = 5)", "Chunks retrieved (K = 5)")

# Update profile labels to reduce unnecessary identifiability.
replace_in_tables("Name (optional)", "Respondent code (optional)")
replace_in_tables("Office / Department / Program", "Office / Department / Program (optional)")

# Remove internal drafting notes from the participant-facing questionnaire.
try:
    notes = find_paragraph("Notes for the group leader (delete before distributing)")
    body = doc._body._element
    current = notes._p
    while current is not None and current.tag != qn("w:sectPr"):
        nxt = current.getnext()
        body.remove(current)
        current = nxt
except ValueError:
    pass

# Save the revised copy, preserving the original source file.
doc.save(str(out))
print(out)
