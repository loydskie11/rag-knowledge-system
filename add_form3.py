import re

with open('src/app/pages/DocumentGenerator.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# I need to add Form 3 headers to DocumentGenerator.tsx

pattern = r'(\} else if \(formName\.includes\("Form 6"\)\) \{\s*headers = \[\'Opportunity\', \'Action Plan\', \'Target Date\', \'Person/s Responsible\', \'Date of Assessment\', \'Date of Actual Completion\'\];\s*\})'

replacement = r"\1 else if (formName.includes(\"Form 3\")) {\n                            headers = ['Function Areas', 'Objective', 'KRA (Short Term)', 'Timetable Short Term', 'KRA (Medium Term)', 'Timetable Medium Term', 'KRA (Long Term)', 'Timetable Long Term'];\n                          }"

text, count = re.subn(pattern, replacement, text)

print(f"Replaced {count} occurrences")
with open('src/app/pages/DocumentGenerator.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
