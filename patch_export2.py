import re

with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# I know it contains `// 3. Map checkbox tokens to Unicode symbols`
parts = content.split('// 3. Map checkbox tokens to Unicode symbols')
if len(parts) == 2:
    # Let's find the dictionary right after it
    # usually it's `const map = { ... }`
    match = re.search(r'const\s+\w+\s*:\s*Record<string,\s*boolean>\s*=\s*\{([^}]*)\};', parts[1])
    if match:
        old_dict = match.group(0)
        new_dict = old_dict.replace('};', ',\n        "[CHECK_EFFECTIVE]": (car.follow_up_result || "").includes("effective") && !(car.follow_up_result || "").includes("ineffective"),\n        "[CHECK_INEFFECTIVE]": (car.follow_up_result || "").includes("ineffective")\n      };')
        parts[1] = parts[1].replace(old_dict, new_dict)
        content = parts[0] + '// 3. Map checkbox tokens to Unicode symbols' + parts[1]
        with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "w", encoding="utf-8") as f:
            f.write(content)
        print("Updated checkboxes!")
    else:
        print("Could not parse dictionary.")
else:
    print("Could not find part 3")
