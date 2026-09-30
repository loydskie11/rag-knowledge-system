import re

with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Fix the field name
content = content.replace('"[REMARKS]": (car.remarks', '"[REMARKS]": (car.comments_remarks')

# Add the extra checkboxes
target_map = '      const checkboxes: Record<string, boolean> = {\n'
if target_map in content:
    print("Found checkboxes record")
else:
    # try another format
    match = re.search(r'const (.*?): Record<string, boolean> = {', content)
    if match:
        var_name = match.group(1)
        print("Found var:", var_name)
        # Find where it ends
        block_end = content.find('};', match.end())
        if block_end != -1:
            new_checks = ',\n        "[CHECK_EFFECTIVE]": (car.follow_up_result || "").includes("effective") && !(car.follow_up_result || "").includes("ineffective"),\n        "[CHECK_INEFFECTIVE]": (car.follow_up_result || "").includes("ineffective")\n      };'
            content = content[:block_end] + new_checks + content[block_end+2:]
            with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "w", encoding="utf-8") as f:
                f.write(content)
            print("Added checkmarks!")
