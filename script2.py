with open('qms_block.tsx', 'r', encoding='utf-8') as f:
    text = f.read()
text = text.replace('isoSubTab === "qms"', 'isoSubTab === "qms_plans"')
text = text.replace('#FF9501', '#DD7230')
text = text.replace('#D97E00', '#c45e22')
with open('qms_block2.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
