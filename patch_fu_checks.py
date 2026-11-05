import re
with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    content = f.read()

target = 'html = html.split("[TYPE_OTHER]").join(ncType.includes("other") ? CHECKED : UNCHECKED);'
replacement = """html = html.split("[TYPE_OTHER]").join(ncType.includes("other") ? CHECKED : UNCHECKED);

      const fuResult = (car.follow_up_result || "").toLowerCase();
      html = html.split("[CHECK_EFFECTIVE]").join((fuResult.includes("effective") && !fuResult.includes("ineffective")) ? CHECKED : UNCHECKED);
      html = html.split("[CHECK_INEFFECTIVE]").join(fuResult.includes("ineffective") ? CHECKED : UNCHECKED);
"""

if target in content:
    content = content.replace(target, replacement)
    with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("Added follow-up checkboxes successfully!")
else:
    print("Could not find TYPE_OTHER")
