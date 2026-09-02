from vector_store import search_knowledge

res = search_knowledge('What is the grading policy for students?')
print(f'Results: {len(res)}')
for i, r in enumerate(res):
    src = r.get('score_source', '?')
    conf = r.get('confidence_score', 0)
    doc = r.get('metadata', {}).get('name', '?')
    preview = repr(r.get('content', '')[:150])
    print(f'[{i+1}] score_source={src} confidence={conf:.3f}')
    print(f'     doc={doc}')
    print(f'     content={preview}')
    print()
