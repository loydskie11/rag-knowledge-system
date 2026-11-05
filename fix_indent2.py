with open(r"c:\Projects\rag-governance\backend\main.py", "r", encoding="utf-8") as lines_f:
    lines = lines_f.readlines()

out = []
for i, line in enumerate(lines):
    if "            doc = docx.Document(io.BytesIO(contents))" in line and lines[i-1].strip() == "import docx as _docx":
        # Fix the line 180 indentation
        out[-1] = "            import docx\n"
        out.append("            doc = docx.Document(io.BytesIO(contents))\n")
    elif "doc = docx.Document(io.BytesIO(contents))" in line and "parts = []" in lines[i+1]:
        # Fix indentation dynamically based on previous line
        spaces = len(lines[i-1]) - len(lines[i-1].lstrip())
        out.append(" " * spaces + "doc = docx.Document(io.BytesIO(contents))\n")
    elif "parts = []" in line and "doc = docx.Document" in lines[i-1]:
        spaces = len(lines[i-2]) - len(lines[i-2].lstrip())
        out.append(" " * spaces + "parts = []\n")
    elif "for block in _iter_block_items(doc):" in line and "parts = []" in lines[i-1]:
        spaces = len(lines[i-3]) - len(lines[i-3].lstrip())
        out.append(" " * spaces + "for block in _iter_block_items(doc):\n")
    elif "if hasattr(block, \"text\"):" in line and "for block in _iter_block_items(doc):" in lines[i-1]:
        spaces = len(lines[i-4]) - len(lines[i-4].lstrip())
        out.append(" " * (spaces + 4) + "if hasattr(block, \"text\"):\n")
    elif "parts.append(block.text)" in line and "if hasattr(block, \"text\"):" in lines[i-1]:
        spaces = len(lines[i-5]) - len(lines[i-5].lstrip())
        out.append(" " * (spaces + 8) + "parts.append(block.text)\n")
    elif "elif hasattr(block, \"rows\"):" in line and "parts.append(block.text)" in lines[i-1]:
        spaces = len(lines[i-6]) - len(lines[i-6].lstrip())
        out.append(" " * (spaces + 4) + "elif hasattr(block, \"rows\"):\n")
    elif "for row in block.rows:" in line and "elif hasattr(block, \"rows\"):" in lines[i-1]:
        spaces = len(lines[i-7]) - len(lines[i-7].lstrip())
        out.append(" " * (spaces + 8) + "for row in block.rows:\n")
    elif "for cell in row.cells:" in line and "for row in block.rows:" in lines[i-1]:
        spaces = len(lines[i-8]) - len(lines[i-8].lstrip())
        out.append(" " * (spaces + 12) + "for cell in row.cells:\n")
    elif "parts.append(cell.text)" in line and "for cell in row.cells:" in lines[i-1]:
        spaces = len(lines[i-9]) - len(lines[i-9].lstrip())
        out.append(" " * (spaces + 16) + "parts.append(cell.text)\n")
    elif "extracted_text = \"\\n\".join(parts)" in line and "parts.append(cell.text)" in lines[i-1]:
        spaces = len(lines[i-10]) - len(lines[i-10].lstrip())
        out.append(" " * spaces + "extracted_text = \"\\n\".join(parts)\n")
    else:
        out.append(line)

with open(r"c:\Projects\rag-governance\backend\main.py", "w", encoding="utf-8") as f:
    f.writelines(out)
print("Indentation fixed.")
