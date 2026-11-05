with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    content = f.read()

parts = content.split('// 3. Map checkbox tokens to Unicode symbols')
if len(parts) == 2:
    block = parts[1][:500]
    # replace unicode safely for printing
    safe_block = block.encode("ascii", "ignore").decode("ascii")
    print(safe_block)
