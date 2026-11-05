import os
import re
from typing import List, Dict, Any, Optional
from supabase import create_client, Client
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv
from rag_policy import NON_RAG_CATEGORIES, is_non_rag_category, is_rag_active_status, normalize_category
from rag_evaluation import text_quality

# Path logic to find .env even if run from different folders
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

supabase: Optional[Client] = None

if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("[INFO] Supabase client initialized successfully for Vector Store.")
    except Exception as e:
        print(f"[ERROR] Failed to initialize Supabase for Vector Store: {e}")
else:
    print("[ERROR] SUPABASE_URL or SUPABASE_SERVICE_KEY is missing from .env!")

# Suppress Hugging Face symlinks warning on Windows
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")

# Load embedding model for semantic embeddings
try:
    # Try loading directly from local Hugging Face cache first (instant, works offline without DNS queries)
    model = SentenceTransformer('all-MiniLM-L6-v2', local_files_only=True)
except Exception:
    try:
        model = SentenceTransformer('all-MiniLM-L6-v2')
    except Exception as e:
        print(f"[WARNING] Could not load SentenceTransformer: {e}")
        model = None



def create_intelligent_chunks(text: str, max_chunk_size: int = 1800, overlap: int = 300) -> List[str]:
    """
    Split extracted document text into retrieval-sized chunks while preserving
    paragraph and sentence context.

    The previous 500-character chunks were often too small for policy clauses:
    a heading, exception, or procedure step could land in a different chunk
    from the rule it qualified. The new default is approximately 350-500
    tokens for ordinary English text, with approximately 60-80 tokens of
    overlap. Chunk sizes remain character-based so this works consistently
    with OCR, TXT, DOCX, and PDF extraction output.
    """
    if not text or not text.strip():
        return []

    # Normalize line endings and whitespace without destroying paragraph
    # boundaries, which are useful section boundaries for policy documents.
    clean_text = text.replace("\r\n", "\n").replace("\r", "\n").strip()
    clean_text = re.sub(r"[ \t]+", " ", clean_text)
    clean_text = re.sub(r"\n{3,}", "\n\n", clean_text)

    # First split on paragraph boundaries. Long paragraphs are then split into
    # sentence-sized units so a chunk does not cut through a clause mid-word.
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n+", clean_text) if p.strip()]
    units: List[str] = []
    for paragraph in paragraphs:
        if len(paragraph) <= max_chunk_size:
            units.append(paragraph)
            continue

        sentences = [
            sentence.strip()
            for sentence in re.split(r"(?<=[.!?])\s+|\n+", paragraph)
            if sentence.strip()
        ]
        if not sentences:
            sentences = [paragraph]

        # Keep very long tables/lines usable by splitting only when a single
        # unit itself exceeds the target size.
        for sentence in sentences:
            if len(sentence) <= max_chunk_size:
                units.append(sentence)
            else:
                step = max(1, max_chunk_size - overlap)
                units.extend(
                    sentence[i:i + max_chunk_size].strip()
                    for i in range(0, len(sentence), step)
                    if sentence[i:i + max_chunk_size].strip()
                )

    chunks: List[str] = []
    current: List[str] = []
    current_length = 0

    for unit in units:
        unit_length = len(unit)
        separator_length = 1 if current else 0

        if current and current_length + separator_length + unit_length > max_chunk_size:
            # If the current buffer contains only carried-over context, do
            # not emit an overlap-only chunk. Drop the overlap and start the
            # new chunk with the actual unit.
            if current_length <= overlap and unit_length <= max_chunk_size:
                chunks.append(" ".join(current).strip())
                current = []
                current_length = 0
            else:
                chunks.append(" ".join(current).strip())

                # Carry complete trailing units into the next chunk. This gives
                # the model context without duplicating arbitrary character slices.
                overlap_units: List[str] = []
                overlap_length = 0
                for previous in reversed(current):
                    additional = len(previous) + (1 if overlap_units else 0)
                    if overlap_units and overlap_length + additional > overlap:
                        break
                    if not overlap_units and len(previous) > overlap:
                        break
                    overlap_units.insert(0, previous)
                    overlap_length += additional

                current = overlap_units
                current_length = sum(len(item) for item in current) + max(0, len(current) - 1)

        if current and current_length + (1 if current else 0) + unit_length > max_chunk_size:
            chunks.append(" ".join(current).strip())
            current = []
            current_length = 0

        current.append(unit)
        current_length += unit_length + (1 if len(current) > 1 else 0)

    if current:
        chunks.append(" ".join(current).strip())

    return [chunk for chunk in chunks if chunk]


def add_to_vector_db(text: str, metadata: dict) -> int:
    """
    Encodes text using intelligent chunking and inserts chunks + embeddings into Supabase.
    """
    if is_non_rag_category((metadata or {}).get("category")):
        print("[INFO] Skipping non-RAG document category during vector indexing.")
        return 0

    quality = text_quality(text)
    if not quality["acceptable"]:
        print(f"[WARNING] Skipping low-quality extraction: {quality}")
        return 0

    if supabase is None:
        print("[WARNING] add_to_vector_db called but supabase client is not initialized!")
        return 0

    chunks = create_intelligent_chunks(text, max_chunk_size=1800, overlap=300)
    if not chunks:
        return 0

    if model is None:
        print("[ERROR] SentenceTransformer model is not loaded. Cannot generate embeddings.")
        return 0

    # Batch encode all embeddings in memory at once
    bounded_chunks = []
    token_budget = model.max_seq_length - model.tokenizer.num_special_tokens_to_add(pair=False)
    for chunk in chunks:
        offsets = model.tokenizer(chunk, add_special_tokens=False, return_offsets_mapping=True)['offset_mapping']
        for start in range(0, len(offsets), max(1, token_budget - 32)):
            end = min(start + token_budget, len(offsets))
            bounded_chunks.append(chunk[offsets[start][0]:offsets[end - 1][1]])
            if end == len(offsets):
                break
    chunks = bounded_chunks
    embeddings = model.encode(chunks).tolist()

    records = [
        {
            "content": chunk,
            "metadata": metadata,
            "embedding": emb
        }
        for chunk, emb in zip(chunks, embeddings)
    ]

    try:
        supabase.table("document_sections").insert(records).execute()
        return len(chunks)
    except Exception as e:
        print(f"[ERROR] add_to_vector_db failed to insert chunks: {e}")
        return 0


def search_knowledge(
    question: str,
    match_count: int = 5,
    excluded_categories: Optional[List[str]] = None
) -> List[Dict[str, Any]]:
    """
    Hybrid Search Strategy:
    1. Collect semantic vector candidates.
    2. Collect lexical keyword candidates regardless of vector result count.
    3. Merge candidates by chunk ID and combine semantic and lexical scores.
    4. Apply governance filters, version selection, and final ranking.
    """
    if supabase is None:
        print("⚠️ search_knowledge called but supabase client is not initialized!")
        return []

    combined_results: List[Dict[str, Any]] = []
    results_by_id: Dict[str, Dict[str, Any]] = {}
    excluded = {
        str(category).strip().lower()
        for category in (excluded_categories or [])
        if category
    }
    excluded.update(NON_RAG_CATEGORIES)

    def metadata_dict(item: Dict[str, Any]) -> Dict[str, Any]:
        metadata = item.get('metadata') or {}
        if isinstance(metadata, str):
            try:
                import json
                metadata = json.loads(metadata)
            except Exception:
                metadata = {}
        return metadata if isinstance(metadata, dict) else {}

    def add_candidate(
        item: Dict[str, Any],
        semantic_score: float = 0.0,
        keyword_hits: int = 0,
        score_source: str = 'hybrid',
    ) -> None:
        item_id = item.get('id') or item.get('content', '')[:50]
        if not item_id:
            return
        meta = metadata_dict(item)
        if is_non_rag_category(meta.get('category')):
            return

        existing = results_by_id.get(str(item_id))
        if existing is None:
            candidate = dict(item)
            candidate['metadata'] = meta
            candidate['_semantic_score'] = max(0.0, float(semantic_score or 0.0))
            candidate['_keyword_hits'] = max(0, int(keyword_hits or 0))
            candidate['score_source'] = score_source
            results_by_id[str(item_id)] = candidate
            combined_results.append(candidate)
            return

        # The same chunk can be found by both retrieval paths. Preserve the
        # strongest signal from each path and mark it as a hybrid match.
        existing['_semantic_score'] = max(
            float(existing.get('_semantic_score') or 0.0),
            float(semantic_score or 0.0),
        )
        existing['_keyword_hits'] = max(
            int(existing.get('_keyword_hits') or 0),
            int(keyword_hits or 0),
        )
        existing['score_source'] = 'hybrid'

    # ---------------------------------------------------------
    # 1. SEMANTIC VECTOR RETRIEVAL (PRIMARY — most reliable)
    # Lowered threshold to 0.30 to catch more genuine matches.
    # We rely on ordering by similarity to rank the best ones.
    # ---------------------------------------------------------
    if model is not None:
        try:
            query_embedding = model.encode(question).tolist()
            response = supabase.rpc(
                'match_document_sections',
                {
                    'query_embedding': query_embedding,
                    'match_threshold': 0.30,
                    'match_count': max(30, match_count * 4)
                }
            ).execute()

            for item in (response.data or []):
                add_candidate(
                    item,
                    semantic_score=float(item.get('similarity', 0.0)),
                    score_source='vector',
                )
        except Exception as e:
            print(f"[Vector Search Error]: {e}")
    else:
        print("[WARNING] Vector model unavailable, falling back directly to keyword search.")

    # ---------------------------------------------------------
    # 2. LEXICAL RETRIEVAL — always run alongside vector search
    # Search all meaningful keywords rather than using lexical search only as
    # a fallback. This protects exact policy numbers, acronyms, and dates.
    # ---------------------------------------------------------
    stop_words = {
        "what", "when", "where", "which", "who", "whom", "this", "that",
        "these", "those", "have", "from", "with", "about", "does", "tell",
        "show", "the", "for", "and", "are", "how", "can", "get", "our"
    }
    meaningful_words = [
        w for w in re.findall(r'[A-Za-z]{4,}', question)
        if w.lower() not in stop_words
    ]

    # Institutional acronyms often do not appear verbatim in the source PDF.
    # Expand known governance terms for lexical retrieval while keeping the
    # original semantic query unchanged.
    query_aliases = {
        "vmgo": ["vision", "mission", "goals", "outcomes"],
        "vmg": ["vision", "mission", "goals"],
    }
    expanded_words = []
    for word in meaningful_words:
        expanded_words.extend(query_aliases.get(word.lower(), [word]))
    meaningful_words = list(dict.fromkeys(expanded_words))

    if meaningful_words:
        try:
            # Search each meaningful keyword and collect unique matching chunks
            for kw in sorted(meaningful_words, key=lambda w: w.lower() in {'university', 'official', 'student'})[:6]:
                kw_res = supabase.table("document_sections") \
                    .select("id, content, metadata") \
                    .ilike("content", f"%{kw}%") \
                    .limit(max(40, match_count * 4)) \
                    .execute()

                for item in (kw_res.data or []):
                    # Count how many query keywords appear in the chunk.
                    content_lower = str(item.get('content') or '').lower()
                    keyword_hits = sum(
                        1 for w in meaningful_words
                        if w.lower() in content_lower
                    )
                    add_candidate(
                        item,
                        keyword_hits=keyword_hits,
                        score_source='keyword',
                    )
        except Exception as kw_err:
            print(f"[Keyword Search Fallback Warning]: {kw_err}")

    # ---------------------------------------------------------
    # 3. FILTERING & ROLE PERMISSIONS
    # ---------------------------------------------------------
    filtered_results = []
    for r in combined_results:
        meta = r.get('metadata') or {}
        # New uploads, archived chunks, superseded versions, and other
        # non-current records must never enter answer evidence.
        if not is_rag_active_status(meta.get('status')):
            continue
        if normalize_category(meta.get('category')) in excluded:
            continue
        content = str(r.get('content') or '').lower()
        query_terms = set(meaningful_words)
        lexical_coverage = (
            sum(1 for word in query_terms if word.lower() in content) / len(query_terms)
            if query_terms else 0.0
        )
        semantic_score = max(0.0, min(1.0, float(r.get('_semantic_score') or 0.0)))
        # Semantic similarity handles paraphrases; lexical coverage protects
        # exact policy terms and improves ranking for names, codes, and dates.
        # The keyword-hit signal is retained separately for diagnostics.
        r['lexical_score'] = lexical_coverage
        r['semantic_score'] = semantic_score
        r['keyword_hits'] = int(r.get('_keyword_hits') or 0)
        r['confidence_score'] = round(max(semantic_score, lexical_coverage * 0.75), 6)
        r.pop('_semantic_score', None)
        r.pop('_keyword_hits', None)
        filtered_results.append(r)

    # Sort by confidence score descending so best semantic matches come first
    filtered_results.sort(key=lambda x: x.get('confidence_score', 0), reverse=True)

    # Prefer the newest active version when legacy data contains duplicates.
    def version_key(value: Any) -> tuple:
        numbers = re.findall(r'\d+', str(value or '0'))
        return tuple(int(number) for number in numbers) or (0,)

    newest_version_by_name: Dict[str, tuple] = {}
    for item in filtered_results:
        meta = item.get('metadata') or {}
        name = str(meta.get('name') or item.get('id') or '')
        item_version = version_key(meta.get('version'))
        if item_version > newest_version_by_name.get(name, (0,)):
            newest_version_by_name[name] = item_version

    deduped = [
        item for item in filtered_results
        if version_key((item.get('metadata') or {}).get('version'))
        == newest_version_by_name.get(str((item.get('metadata') or {}).get('name') or item.get('id') or ''))
    ]
    deduped.sort(key=lambda x: x.get('confidence_score', 0), reverse=True)

    # Document-level questions such as VMGO request several sections from one
    # uploaded document. Top-k similarity alone can return Vision/Mission while
    # dropping a lower-scoring Outcomes chunk from that same document. Once a
    # relevant source is identified, bring in the remaining chunks from that
    # source so the answer model sees the complete requested bundle.
    bundle_terms = {"vmgo", "vision", "mission", "goals", "outcomes"}
    if False:  # Disable unbounded whole-document expansion.
        source_names = {
            str((item.get('metadata') or {}).get('name') or '')
            for item in deduped[:2]
            if (item.get('metadata') or {}).get('name')
        }
        for source_name in source_names:
            try:
                source_rows = supabase.table("document_sections").select("id, content, metadata").eq("metadata->>name", source_name).limit(50).execute()
                existing_ids = {item.get('id') for item in deduped}
                for item in (source_rows.data or []):
                    meta = item.get('metadata') or {}
                    if item.get('id') in existing_ids:
                        continue
                    if not is_rag_active_status(meta.get('status')):
                        continue
                    if normalize_category(meta.get('category')) in excluded:
                        continue
                    item['score_source'] = 'document_context'
                    item['semantic_score'] = 0.40
                    item['lexical_score'] = 0.0
                    item['confidence_score'] = 0.40
                    deduped.append(item)
            except Exception as bundle_err:
                print(f"[Document Context Warning]: {bundle_err}")
    # Keep the complete matched document for bundle questions. The normal
    # top-k limit is useful for focused questions, but it can silently drop
    # sections such as Outcomes from a VMGO request.
    return deduped[:match_count]
