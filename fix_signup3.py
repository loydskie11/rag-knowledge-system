import sys

with open("c:/Projects/rag-governance/src/app/pages/SignUpPage.tsx", "r", encoding="utf-8") as f:
    content = f.read()

target = """              {/* Password Requirement Hint */}
              <p className="text-xs text-gray-400">
                Minimum 8 characters with an uppercase letter, number, and special character.
              </p>"""

replacement = """              {formData.password.length > 0 && !isPasswordValid && (
                <div className="mt-2 mb-4 p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-xs font-bold text-gray-700 mb-2">Password requirements</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <PasswordRequirement valid={pwdChecks.length} text="At least 8 characters" />
                    <PasswordRequirement valid={pwdChecks.uppercase} text="1 uppercase letter" />
                    <PasswordRequirement valid={pwdChecks.number} text="1 number" />
                    <PasswordRequirement valid={pwdChecks.special} text="1 special character" />
                  </div>
                </div>
              )}"""

if target in content:
    content = content.replace(target, replacement)
    with open("c:/Projects/rag-governance/src/app/pages/SignUpPage.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found. Doing fallback replace.")
    content = content.replace("""              <p className="text-xs text-gray-400">
                Minimum 8 characters with an uppercase letter, number, and special character.
              </p>""", replacement)
    with open("c:/Projects/rag-governance/src/app/pages/SignUpPage.tsx", "w", encoding="utf-8") as f:
        f.write(content)

