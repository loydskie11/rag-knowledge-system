import re

with open(r"c:\Projects\rag-governance\backend\main.py", "r", encoding="utf-8") as f:
    content = f.read()

iter_block_def = """
def _iter_block_items(parent):
    import docx
    from docx.document import Document
    from docx.oxml.text.paragraph import CT_P
    from docx.oxml.table import CT_Tbl
    from docx.table import _Cell, Table
    from docx.text.paragraph import Paragraph
    if isinstance(parent, Document):
        parent_elm = parent.element.body
    elif isinstance(parent, _Cell):
        parent_elm = parent._tc
    else:
        raise ValueError("Unsupported parent type")
    for child in parent_elm.iterchildren():
        if isinstance(child, CT_P):
            yield Paragraph(child, parent)
        elif isinstance(child, CT_Tbl):
            yield Table(child, parent)
"""

# Insert iter_block_def after `def _escape_html` or somewhere top level
if "_iter_block_items" not in content:
    content = content.replace("def _escape_html", iter_block_def + "\n\ndef _escape_html")

# Fix docx_to_html_with_assets
old_docx_to_html = """    lines = []
    for para in doc.paragraphs:
        inner = _docx_runs_to_html(para)
        style_name = (para.style.name or "").lower() if para.style else ""
        attr = _align_attr(para)

        if not inner.strip():
            lines.append(f"<p{attr}><br></p>")
            continue

        if style_name == "title" or "heading 1" in style_name:
            lines.append(f"<h1{attr}>{inner}</h1>")
        elif "heading 2" in style_name:
            lines.append(f"<h2{attr}>{inner}</h2>")
        elif "heading 3" in style_name:
            lines.append(f"<h3{attr}>{inner}</h3>")
        elif "list" in style_name:
            lines.append(f"<li{attr}>{inner}</li>")
        else:
            lines.append(f"<p{attr}>{inner}</p>")

    html = "\\n".join(lines)"""

new_docx_to_html = """    from docx.table import Table
    from docx.text.paragraph import Paragraph

    lines = []
    for block in _iter_block_items(doc):
        if isinstance(block, Paragraph):
            para = block
            inner = _docx_runs_to_html(para)
            style_name = (para.style.name or "").lower() if para.style else ""
            attr = _align_attr(para)

            if not inner.strip():
                lines.append(f"<p{attr}><br></p>")
                continue

            if style_name == "title" or "heading 1" in style_name:
                lines.append(f"<h1{attr}>{inner}</h1>")
            elif "heading 2" in style_name:
                lines.append(f"<h2{attr}>{inner}</h2>")
            elif "heading 3" in style_name:
                lines.append(f"<h3{attr}>{inner}</h3>")
            elif "list" in style_name:
                lines.append(f"<li{attr}>{inner}</li>")
            else:
                lines.append(f"<p{attr}>{inner}</p>")
        elif isinstance(block, Table):
            lines.append('<table border="1" style="border-collapse: collapse; width: 100%;">')
            for row in block.rows:
                lines.append("<tr>")
                for cell in row.cells:
                    lines.append("<td style='padding: 4px;'>")
                    for cell_block in _iter_block_items(cell):
                        if isinstance(cell_block, Paragraph):
                            inner = _docx_runs_to_html(cell_block)
                            lines.append(f"<p>{inner}</p>" if inner.strip() else "<p><br></p>")
                    lines.append("</td>")
                lines.append("</tr>")
            lines.append("</table>")

    html = "\\n".join(lines)"""
content = content.replace(old_docx_to_html, new_docx_to_html)

# Fix ALL plain text extraction blocks (`extracted_text = "\n".join([p.text for p in doc.paragraphs])` etc)
def replacer(match):
    return """            doc = docx.Document(io.BytesIO(contents))
            parts = []
            for block in _iter_block_items(doc):
                if hasattr(block, "text"):
                    parts.append(block.text)
                elif hasattr(block, "rows"):
                    for row in block.rows:
                        for cell in row.cells:
                            parts.append(cell.text)
            extracted_text = "\\n".join(parts)"""

# In process_document_background it uses `import docx as _docx`
# Let's just do standard replace for `extracted_text = ...doc.paragraphs]`
content = re.sub(r'doc\s*=\s*_?docx\.Document\(io\.BytesIO\(contents\)\)\s*\n\s*extracted_text\s*=\s*"\\n"\.join\(\[?.*?for.*?in.*?doc\.paragraphs\]?\)', replacer, content, flags=re.DOTALL)
content = re.sub(r'doc\s*=\s*docx\.Document\(io\.BytesIO\(contents\)\)\s*\n\s*extracted_text\s*=\s*"\\n"\.join\(\[?.*?for.*?in.*?doc\.paragraphs\]?\)', replacer, content, flags=re.DOTALL)


with open(r"c:\Projects\rag-governance\backend\main.py", "w", encoding="utf-8") as f:
    f.write(content)
print("Applied _iter_block_items and fixed tables!")
