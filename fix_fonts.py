import re

with open("src/app/pages/ProfileSettings.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Headers
content = content.replace('className="text-3xl text-gray-900 mb-2"', 'className="text-xl sm:text-2xl font-bold text-gray-900"')
content = content.replace('className="text-gray-600"', 'className="text-xs sm:text-sm text-gray-500 mt-0.5"')

# Section headers
content = content.replace('className="font-bold text-gray-900"', 'className="text-sm font-bold text-gray-900"')
content = content.replace('className="text-xs text-gray-400 mt-0.5"', 'className="text-xs text-gray-500 mt-0.5"')

# Labels
content = content.replace('className="block text-sm font-semibold text-gray-700 mb-2"', 'className="block text-xs font-medium text-gray-700 mb-1.5"')
content = content.replace('className="block text-xs font-semibold text-gray-700 mb-1.5"', 'className="block text-xs font-medium text-gray-700 mb-1.5"')

# Inputs
content = content.replace('rounded-xl text-sm', 'rounded-lg text-xs')
content = content.replace('h-11', 'h-9')
content = content.replace('px-5', 'px-4')
content = content.replace('text-sm font-semibold rounded-xl', 'text-xs font-semibold rounded-lg')
content = content.replace('text-sm text-gray-800', 'text-xs text-gray-800')

# Modals
content = content.replace('text-2xl font-bold', 'text-lg font-bold')
content = content.replace('text-xl font-bold', 'text-base font-bold')

with open("src/app/pages/ProfileSettings.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Done")
