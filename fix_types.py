import os
import re

dashboard_dir = r"c:\Projects\rag-governance\src\app\pages\CssDashboard"

def fix_imports(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    types_to_extract = ['SurveyResponse', 'DashboardFilters', 'KPIData', 'ChartDataPoint', 'SQDAverage', 'LikertScale']

    pattern = re.compile(r"import\s+\{([^}]+)\}\s+from\s+['\"](\.\./types/survey|\.\./\.\./types/survey)['\"];?")
    
    def replacer(match):
        imports = [i.strip() for i in match.group(1).split(',')]
        path = match.group(2)
        
        types = [i for i in imports if i in types_to_extract]
        values = [i for i in imports if i and i not in types_to_extract]
        
        result = []
        if types:
            result.append(f"import type {{ {', '.join(types)} }} from '{path}';")
        if values:
            result.append(f"import {{ {', '.join(values)} }} from '{path}';")
            
        return "\n".join(result)

    new_content = pattern.sub(replacer, content)

    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Fixed {filepath}")

for root, _, files in os.walk(dashboard_dir):
    for file in files:
        if file.endswith('.ts') or file.endswith('.tsx'):
            fix_imports(os.path.join(root, file))
