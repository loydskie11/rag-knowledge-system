import re

with open(r"c:\Projects\rag-governance\backend\main.py", "r", encoding="utf-8") as f:
    content = f.read()

# 1. process_document_background text extraction
target1 = '''        elif filename_lower.endswith(".txt"):
            extracted_text = contents.decode("utf-8")'''
rep1 = '''        elif filename_lower.endswith((".txt", ".html")):
            extracted_text = contents.decode("utf-8", errors="ignore")'''

# 2. _backfill_content_html HTML parsing
target2 = '''        elif filename.endswith(".txt"):
            text = contents.decode("utf-8", errors="ignore")
            escaped = _escape_html(text)
            content_html = "".join(
                f"<p>{line}</p>" if line.strip() else "<p><br></p>"
                for line in escaped.split("\\n")
            )'''
rep2 = '''        elif filename.endswith((".txt", ".html")):
            text = contents.decode("utf-8", errors="ignore")
            if filename.endswith(".html"):
                content_html = text
            else:
                escaped = _escape_html(text)
                content_html = "".join(
                    f"<p>{line}</p>" if line.strip() else "<p><br></p>"
                    for line in escaped.split("\\n")
                )'''

if target1 in content and target2 in content:
    content = content.replace(target1, rep1)
    content = content.replace(target2, rep2)
    with open(r"c:\Projects\rag-governance\backend\main.py", "w", encoding="utf-8") as f:
        f.write(content)
    print("Fixed HTML parsing for templates!")
else:
    print("Could not find targets.")
