import os
import re
from typing import List, Dict, Any, Optional
from supabase import create_client, Client
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

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

# Load embedding model for semantic embeddings
model = SentenceTransformer('all-MiniLM-L6-v2')


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
    if supabase is None:
        print("[WARNING] add_to_vector_db called but supabase client is not initialized!")
        return 0

    chunks = create_intelligent_chunks(text, max_chunk_size=500, overlap=100)
    if not chunks:
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
    1. Vector Semantic Search using embedding cosine similarity
    2. Exact Keyword Search for acronyms, codes, and key policy terms
    3. Merges and deduplicates results to guarantee both semantic and exact precision.
    """
    if supabase is None:
        print("⚠️ search_knowledge called but supabase client is not initialized!")
        return []

    fetch_count = match_count * 3 if excluded_categories else match_count
    combined_results: List[Dict[str, Any]] = []
    seen_ids = set()

    # ---------------------------------------------------------
    # 1. SEMANTIC VECTOR RETRIEVAL
    # ---------------------------------------------------------
    try:
        query_embedding = model.encode(question).tolist()
        response = supabase.rpc(
            'match_document_sections',
            {
                'query_embedding': query_embedding,
                'match_threshold': 0.25,
                'match_count': fetch_count
            }
        ).execute()

        for item in (response.data or []):
            item_id = item.get('id') or item.get('content')
            if item_id and item_id not in seen_ids:
                seen_ids.add(item_id)
                item['score_source'] = 'vector'
                combined_results.append(item)
    except Exception as e:
        print(f"[Vector Search Error]: {e}")

    # ---------------------------------------------------------
    # 2. KEYWORD EXACT TERM RETRIEVAL (HYBRID ENHANCEMENT)
    # ---------------------------------------------------------
    # Extract significant keywords (longer than 3 chars, skipping stop words)
    stop_words = {"what", "when", "where", "which", "who", "whom", "this", "that", "these", "those", "have", "from", "with", "about"}
    words = [w for w in re.findall(r'[A-Za-z0-9_-]{3,}', question) if w.lower() not in stop_words]

    if words:
        keyword_query = " | ".join(words[:4]) # Search top keywords
        try:
            kw_res = supabase.table("document_sections") \
                .select("id, content, metadata") \
                .ilike("content", f"%{words[0]}%") \
                .limit(fetch_count) \
                .execute()

            for item in (kw_res.data or []):
                item_id = item.get('id') or item.get('content')
                if item_id and item_id not in seen_ids:
                    seen_ids.add(item_id)
                    item['score_source'] = 'keyword'
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
        if excluded_categories and meta.get('category') in excluded_categories:
            continue
        filtered_results.append(r)

    return filtered_results[:match_count]