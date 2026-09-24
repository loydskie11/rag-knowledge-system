import sys
with open("c:/Projects/rag-governance/src/app/pages/SignUpPage.tsx", "a", encoding="utf-8") as f:
    f.write("\n\nfunction PasswordRequirement({ valid, text }: { valid: boolean; text: string }) {\n")
    f.write("  return (\n")
    f.write("    <div className={`flex items-center gap-2 text-xs ${valid ? \"text-green-600\" : \"text-gray-500\"}`}>\n")
    f.write("      <span className={`flex items-center justify-center w-5 h-5 rounded-full ${valid ? \"bg-green-100\" : \"bg-gray-200\"}`}>\n")
    f.write("        {valid ? <Check className=\"w-3 h-3\" /> : <X className=\"w-3 h-3\" />}\n")
    f.write("      </span>\n")
    f.write("      <span>{text}</span>\n")
    f.write("    </div>\n")
    f.write("  );\n")
    f.write("}\n")
