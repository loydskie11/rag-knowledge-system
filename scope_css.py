import re

css_path = r'c:\Projects\rag-governance\src\app\pages\CssDashboard\index.css'

with open(css_path, 'r', encoding='utf-8') as f:
    css = f.read()

# Remove global reset
css = re.sub(r'\*,\s*\*\:\:before,\s*\*\:\:after\s*\{[^}]+\}', '', css)

# Remove html reset
css = re.sub(r'html\s*\{[^}]+\}', '', css)

# Scope base selectors
css = re.sub(r'\b(a)\s*\{', r'.css-dashboard-wrapper \1 {', css)
css = re.sub(r'\b(a:hover)\s*\{', r'.css-dashboard-wrapper \1 {', css)
css = re.sub(r'\b(button)\s*\{', r'.css-dashboard-wrapper \1 {', css)
css = re.sub(r'\b(input, select, textarea)\s*\{', r'.css-dashboard-wrapper input, .css-dashboard-wrapper select, .css-dashboard-wrapper textarea {', css)
css = re.sub(r'\b(input:focus, select:focus, textarea:focus)\s*\{', r'.css-dashboard-wrapper input:focus, .css-dashboard-wrapper select:focus, .css-dashboard-wrapper textarea:focus {', css)

# Scrollbar might also need scope if possible, but webkit scrollbar is global usually, let's leave it or scope it
css = re.sub(r'::-webkit-scrollbar\b', r'.css-dashboard-wrapper ::-webkit-scrollbar', css)
css = re.sub(r'::-webkit-scrollbar-track\b', r'.css-dashboard-wrapper ::-webkit-scrollbar-track', css)
css = re.sub(r'::-webkit-scrollbar-thumb\b', r'.css-dashboard-wrapper ::-webkit-scrollbar-thumb', css)

with open(css_path, 'w', encoding='utf-8') as f:
    f.write(css)

print("CSS scoping complete.")
