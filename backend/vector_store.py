import os
import re
from typing import List, Dict, Any, Optional
from supabase import create_client, Client
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv
from rag_policy import NON_RAG_CATEGORIES, is_non_rag_category
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



def create_intelligent_chunks(text: str, max_chunk_size: int = 500, overlap: int = 100) -> List[str]:
    """
    Splits text into chunks respecting sentence boundaries and paragraphs
    with a sliding overlap to maintain semantic continuity.
    """
    if not text or not text.strip():
        return []

    # Normalize whitespace
    clean_text = text.strip()

    # Split into paragraphs or sentences
    sentences = re.split(r'(?<=[.?!])\s+|\n\n+', clean_text)
    
    chunks = []
    current_chunk = []
    current_length = 0

    for sentence in sentences:
        s = sentence.strip()
        if not s:
            continue
        s_len = len(s)

        if current_length + s_len > max_chunk_size and current_chunk:
            chunk_str = " ".join(current_chunk)
            chunks.append(chunk_str)
            
            # Retain overlap sentences from the end of current chunk
            overlap_sentences = []
            overlap_len = 0
            for prev_s in reversed(current_chunk):
                if overlap_len + len(prev_s) <= overlap:
                    overlap_sentences.insert(0, prev_s)
                    overlap_len += len(prev_s)
                else:
                    break
            
            current_chunk = overlap_sentences
            current_length = sum(len(x) for x in current_chunk)

        current_chunk.append(s)
        current_length += s_len

    if current_chunk:
        chunks.append(" ".join(current_chunk))

    # Fallback for texts without sentence markers
    if not chunks:
        chunks = [clean_text[i:i + max_chunk_size] for i in range(0, len(clean_text), max_chunk_size - overlap)]

    return chunks


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

    chunks = create_intelligent_chunks(text, max_chunk_size=500, overlap=100)
    if not chunks:
        return 0

    if model is None:
        print("[ERROR] SentenceTransformer model is not loaded. Cannot generate embeddings.")
        return 0

    # Batch encode all embeddings in memory at once
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
    1. Vector Semantic Search using embedding cosine similarity (primary, most reliable)
    2. Keyword fallback ONLY when semantic search returns insufficient results
    3. Merges and deduplicates results, keeping the highest-confidence ones.
    """
    if supabase is None:
        print("⚠️ search_knowledge called but supabase client is not initialized!")
        return []

    combined_results: List[Dict[str, Any]] = []
    excluded = {
        str(category).strip().lower()
        for category in (excluded_categories or [])
        if category
    }
    excluded.update(NON_RAG_CATEGORIES)
    seen_ids = set()

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
                    'match_count': match_count * 2  # Fetch extra, we'll filter below
                }
            ).execute()

            for item in (response.data or []):
                item_id = item.get('id') or item.get('content', '')[:50]
                if item_id and item_id not in seen_ids:
                    seen_ids.add(item_id)
                    item['score_source'] = 'vector'
                    item['confidence_score'] = float(item.get('similarity', 0.0))
                    combined_results.append(item)
        except Exception as e:
            print(f"[Vector Search Error]: {e}")
    else:
        print("[WARNING] Vector model unavailable, falling back directly to keyword search.")

    # ---------------------------------------------------------
    # 2. KEYWORD FALLBACK — only used when vector gives few results
    # Search ALL meaningful keywords (not just words[0]) using OR ilike
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

    if len(combined_results) < match_count and meaningful_words:
        try:
            # Search each meaningful keyword and collect unique matching chunks
            for kw in meaningful_words[:4]:
                kw_res = supabase.table("document_sections") \
                    .select("id, content, metadata") \
                    .ilike("content", f"%{kw}%") \
                    .limit(match_count * 2) \
                    .execute()

                for item in (kw_res.data or []):
                    if is_non_rag_category((item.get('metadata') or {}).get('category')):
                        continue
                    item_id = item.get('id') or item.get('content', '')[:50]
                    if item_id and item_id not in seen_ids:
                        seen_ids.add(item_id)
                        item['score_source'] = 'keyword'
                        # Count how many query keywords appear in the chunk
                        content_lower = item.get('content', '').lower()
                        keyword_hits = sum(
                            1 for w in meaningful_words
                            if w.lower() in content_lower
                        )
                        # Keyword confidence is proportional to keyword overlap
                        item['confidence_score'] = min(0.6, keyword_hits * 0.15)
                        combined_results.append(item)
        except Exception as kw_err:
            print(f"[Keyword Search Fallback Warning]: {kw_err}")

    # ---------------------------------------------------------
    # 3. FILTERING & ROLE PERMISSIONS
    # ---------------------------------------------------------
    filtered_results = []
    for r in combined_results:
        meta = r.get('metadata') or {}
        if meta.get('status') == 'Archived':
            continue
        # New uploads are reviewable but must not answer users until approved.
        if str(meta.get('status') or 'Active').strip().lower() not in {
            'active', 'approved', 'published'
        }:
            continue
        if str(meta.get('category') or '').strip().lower() in excluded:
            continue
        content = str(r.get('content') or '').lower()
        query_terms = set(meaningful_words)
        lexical_coverage = (
            sum(1 for word in query_terms if word.lower() in content) / len(query_terms)
            if query_terms else 0.0
        )
        semantic_score = float(r.get('confidence_score') or 0.0)
        # Semantic similarity handles paraphrases; lexical coverage protects
        # exact policy terms and improves ranking for names, codes, and dates.
        r['semantic_score'] = semantic_score
        r['lexical_score'] = lexical_coverage
        r['confidence_score'] = round((semantic_score * 0.75) + (lexical_coverage * 0.25), 6)
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
    if bundle_terms.intersection({word.lower() for word in meaningful_words}) and deduped:
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
                    if str(meta.get('status') or 'Active').strip().lower() not in {'active', 'approved', 'published'}:
                        continue
                    if str(meta.get('category') or '').strip().lower() in excluded:
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
    if bundle_terms.intersection({word.lower() for word in meaningful_words}) and deduped:
        return deduped[:50]
    return deduped[:match_count]
