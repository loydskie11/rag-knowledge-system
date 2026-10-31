# RAG Pipeline Improvement Plan

## Objective

Improve the accuracy, reliability, and explainability of the CTU institutional RAG assistant before migrating the system away from Supabase.

The priority is to improve the evidence pipeline first: extraction, chunking, embeddings, retrieval, reranking, and evaluation. Model fine-tuning is not the first step.

## Current baseline

- PyMuPDF extracts text from born-digital PDFs.
- PaddleOCR handles scanned pages and images.
- `llama3.2-vision` is used as a selective OCR/layout fallback.
- `all-MiniLM-L6-v2` generates document and query embeddings.
- Supabase/Postgres stores chunks and vectors.
- Vector search is primary, with keyword fallback.
- `llama3.1` generates grounded answers.
- A deterministic evidence-support check is applied after generation.

## Evaluation dataset

Use the 35 prepared questions as the first evaluation set. For each question, record:

- Expected answer or required answer terms.
- Expected source document.
- Expected section/page when available.
- Whether the question should be answerable.
- Whether the user role is allowed to receive the answer.

Track the following baseline metrics:

- Top-5 source retrieval accuracy.
- Correct answer rate.
- Expected-term coverage.
- Evidence-support score.
- Unsupported-answer rate.
- No-answer/abstention correctness.
- Retrieval and total response latency.

Keep the baseline results before changing the pipeline.

## Priority 1 — Extraction and OCR reliability

- Fix the vision fallback URL so it works in local and Docker deployments.
- Process mixed PDFs page by page instead of returning early after finding enough text.
- Preserve page numbers and source locations.
- Improve table and heading extraction.
- Use structured JSON extraction for controlled forms.
- Record extraction quality, OCR fallback usage, and extraction failures.
- Preserve raw extracted text for debugging and comparison.

Bad extraction creates bad chunks and embeddings, so this is foundational.

## Priority 2 — Section-aware chunking

Replace the current small fixed chunks with section-aware chunks:

- Target approximately 300–500 tokens per chunk.
- Use 50–80 tokens of overlap.
- Split at headings, paragraphs, clauses, and table boundaries.
- Keep a heading or section path with every chunk.
- Preserve page number, document name, version, office, category, approval status, and source ID.
- Avoid splitting a table row or policy clause across unrelated chunks when possible.

Example chunk metadata:

```json
{
  "document_name": "ISO Quality Manual",
  "section": "7.5 Documented Information",
  "page": 42,
  "version": "2026",
  "category": "ISO",
  "status": "Approved"
}
```

## Priority 3 — Embedding comparison

Keep `all-MiniLM-L6-v2` as the baseline. Test one stronger local embedding model:

- `BAAI/bge-base-en-v1.5` for primarily English documents.
- A multilingual embedding model if Filipino or Cebuano documents are important.
- `nomic-embed-text` if embedding inference through Ollama is preferred.

Compare models using the 35-question evaluation set before selecting one. Changing the embedding model requires re-embedding the approved corpus.

## Priority 4 — True hybrid retrieval

Replace vector-first/keyword-fallback behavior with combined retrieval:

```text
Question
  ├── Vector search: top 20–30
  ├── Lexical/BM25 search: top 20–30
  ├── Merge and deduplicate
  ├── Apply role, status, category, and version filters
  └── Send candidates to the reranker
```

Hybrid retrieval is especially important for policy numbers, ISO clauses, acronyms, dates, office names, document titles, and exact codes.

## Priority 5 — Local reranking

Retrieve more candidates, then rerank them with a local cross-encoder. Start with:

```text
cross-encoder/ms-marco-MiniLM-L-6-v2
```

Recommended initial configuration:

- Retrieve 20–30 candidates.
- Rerank them locally.
- Pass the best 5–8 chunks to the answer model.
- Preserve the original retrieval and reranking scores for diagnostics.

## Priority 6 — Answer generation and grounding

Keep the answer model separate from the embedding and vision models. The answer prompt should require:

- Use only retrieved evidence.
- State uncertainty when evidence is insufficient.
- Do not invent dates, offices, versions, or policy rules.
- Preserve distinctions between documents and versions.
- Answer each supported part of a multi-part question.
- Keep source metadata available to the UI without unnecessarily repeating it in the answer.

Improve the evidence check beyond simple word overlap over time, but retain the current deterministic check as a safety baseline.

## Priority 7 — Document-level and neighboring context

Support questions that need several chunks from one document:

- Store parent document and child chunk relationships.
- Expand to neighboring chunks after a strong match.
- Prefer the newest approved version.
- Use section-aware grouping.
- Prevent one isolated high-scoring sentence from hiding the rest of a relevant policy section.

## Regression testing

After each change, compare the improved pipeline against the baseline using the same 35 questions. Record:

- Top-5 retrieval accuracy.
- Correct answer rate.
- Evidence-support score.
- Unsupported-answer rate.
- Abstention accuracy.
- Average and worst-case latency.

Do not adopt a change only because one example looks better; require improvement across the evaluation set or document the tradeoff.

## Suggested implementation sequence

1. Resolve Ollama/backend timeout and extraction reliability.
2. Run and save the 35-question baseline.
3. Implement section-aware chunking.
4. Compare embedding models.
5. Implement true hybrid retrieval.
6. Add local reranking.
7. Improve answer grounding and evaluation.
8. Re-index approved documents.
9. Freeze the best configuration for the presentation.

## Decision about fine-tuning

Do not fine-tune `llama3.2-vision` yet. Consider LoRA/QLoRA only if the same controlled visual fields repeatedly fail after preprocessing, prompting, and validation improvements. Keep changing institutional knowledge in the RAG corpus rather than model weights.
