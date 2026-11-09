from docx import Document
from docx.oxml import OxmlElement
from pathlib import Path

src = Path(r"C:\Projects\rag-governance\Evaluation-Questionnaire-RAG-Powered-Institutional-Knowledge-System-Gender-Inclusive.docx")
out = Path(r"C:\Projects\rag-governance\Evaluation-Questionnaire-RAG-Powered-Institutional-Knowledge-System-Complete-Modules.docx")
doc = Document(str(src))

def set_cell(cell, text):
    p = cell.paragraphs[0]
    for r in p.runs:
        r.text = ""
    if p.runs:
        p.runs[0].text = text
    else:
        p.add_run(text)

# Add the missing user-facing modules to the module-use checklist.
for p in doc.paragraphs:
    if p.text.strip() == "☐ Document Upload & Metadata Management":
        # Insert after the matching paragraph using the existing paragraph style.
        for text in [
            "☐ Document Tracker",
            "☐ Broadcast Announcement",
        ]:
            new_p = OxmlElement("w:p")
            p._p.addnext(new_p)
            from docx.text.paragraph import Paragraph
            np = Paragraph(new_p, p._parent)
            np.add_run(text)
            p = np
        break

# The functional-validation table is the eleventh table in the document.
table = doc.tables[10]
for row in table.rows:
    if row.cells[0].text.strip() == "Overall Functional Impact":
        overall_row = row
        break
else:
    raise ValueError("Overall Functional Impact row not found")

new_rows = []
for values in [
    ["Objective 6. Institutional Communication and Document Tracking", "", "", "", "", ""],
    ["11. The Broadcast Announcement module allows authorized users to create and distribute timely announcements to intended recipients.", "", "", "", "", ""],
    ["12. The Document Tracker provides clear status, ownership, deadlines, and progress information for institutional documents.", "", "", "", "", ""],
]:
    row = table.add_row()
    for i, value in enumerate(values):
        set_cell(row.cells[i], value)
    overall_row._tr.addprevious(row._tr)
    new_rows.append(row)

# Renumber the existing overall-impact item after adding the two module items.
for row in table.rows:
    if row.cells[0].text.strip().startswith("11. Overall, the system"):
        set_cell(row.cells[0], "13. Overall, the system streamlines document management, reduces administrative overhead, and strengthens institutional governance.")
        break

# Align the instructions with the expanded objective coverage.
for p in doc.paragraphs:
    if "This part checks whether the system achieved Specific Objectives 1 to 5" in p.text:
        for r in p.runs:
            r.text = ""
        p.runs[0].text = "This part checks whether the system achieved Specific Objectives 1 to 6 of the study. Answer only the items for the modules you used."
        break

doc.save(str(out))
print(out)
