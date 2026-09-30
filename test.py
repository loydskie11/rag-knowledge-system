import re

html = """
<html>
<head>
<style>
  @page { size: A4 portrait; margin: 15mm; }
  * { box-sizing: border-box; font-family: "Times New Roman"; }
  body { font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.35; color: #000; margin: 0; padding: 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  td, th { border: 1px solid #000; padding: 5px 8px; vertical-align: top; font-size: 9.5pt; }
</style>
</head>
<body><h1>Hello</h1></body></html>
"""

def repl(match):
    css = match.group(1)
    css = re.sub(r'(?:\b|^)body\s*\{', '.wysiwyg-content {', css, flags=re.I)
    css = re.sub(r'(?:\b|^)html\s*\{', '.wysiwyg-content {', css, flags=re.I)
    css = re.sub(r'(?:\b|^|\s)\*\s*\{', ' .wysiwyg-content * {', css, flags=re.I)
    return f"<style>{css}</style>"

print(re.sub(r'<style[^>]*>([\s\S]*?)</style>', repl, html, flags=re.I))
