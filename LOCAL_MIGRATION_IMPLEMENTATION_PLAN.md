# Local Migration Implementation Plan

## Objective

Run the CTU RAG Governance System on a local computer without a Supabase subscription or an internet connection during normal campus use.

The local computer will act as the application server. Users connected to the same campus Wi-Fi will access the system through the server's local IP address or a campus DNS name.

## Target local architecture

```text
Campus browser
      |
      | Campus Wi-Fi / LAN
      v
Local server computer
      |
      +-- React frontend served locally
      +-- FastAPI backend
      +-- PostgreSQL + pgvector
      +-- Local document storage
      +-- Ollama local AI inference
          +-- Text generation model
          +-- Embedding model
          +-- Vision/OCR fallback model
```

## Supabase replacement map

| Current capability | Local replacement |
| --- | --- |
| Supabase PostgreSQL | Local PostgreSQL |
| Supabase pgvector | PostgreSQL with the pgvector extension |
| Supabase Storage | Protected local document directories |
| Supabase user/data access | FastAPI plus local PostgreSQL |
| Supabase signed file URLs | Authenticated FastAPI file endpoints |
| Supabase chat history | Local PostgreSQL |
| Supabase audit logs | Local PostgreSQL |
| Supabase notifications | Local database plus existing application logic |
| Cloud AI | Ollama |
| Cloudflare Tunnel | Optional internet-access layer only; not part of offline mode |

## Hardware target

The current laptop is suitable for the presentation and a small pilot:

- 16 GB system RAM
- 1 TB SSD
- GeForce RTX 5060 Laptop GPU, normally with 8 GB VRAM

Use quantized local models and limit simultaneous AI requests. The laptop must remain powered on and connected to the campus network while serving users.

## Implementation phases

### Phase 0 — Preserve the current system

- Keep the current Supabase configuration working until the local system is verified.
- Export a database backup before migration.
- Download or preserve all uploaded document files.
- Do not delete Supabase data during the migration.

### Phase 1 — Local RAG foundation

- Add PostgreSQL and pgvector to the local Docker Compose deployment.
- Create local equivalents of `document_sections` and the RAG-related metadata.
- Replace Supabase vector insert and search calls with a local repository/data-access layer.
- Store uploaded RAG documents under a protected local data directory.
- Keep document metadata, approval status, versions, and categories intact.
- Rebuild embeddings locally after the embedding model is finalized.

### Phase 2 — Local application data

- Migrate users and roles.
- Migrate system settings.
- Migrate chat history.
- Migrate audit and access logs.
- Migrate document, accreditation, ISO, CHED, QMS, and workflow records.
- Replace Supabase-specific queries with local SQLAlchemy or PostgreSQL access.

### Phase 3 — Local file access and security

- Replace Supabase Storage upload/download calls.
- Serve documents only through authenticated FastAPI endpoints.
- Prevent direct directory browsing.
- Preserve role-based document access rules.
- Add local backup and restore scripts.
- Test archived, pending, approved, and versioned documents.

### Phase 4 — Campus network deployment

- Assign the server computer a stable LAN IP.
- Configure the backend and frontend to listen on the LAN interface.
- Allow only the required application port through the server firewall.
- Confirm that campus Wi-Fi permits device-to-server communication.
- Test from multiple phones and laptops on the same Wi-Fi.
- Add a campus DNS name if the network administrator provides one.

### Phase 5 — Optional remote access

- Install `cloudflared` only if outside-campus access is required.
- Publish only the web application, never PostgreSQL or Ollama directly.
- Add Cloudflare Access or equivalent authentication controls.
- Treat internet access as optional; the LAN system must continue working without it.
- Document that Cloudflare Tunnel requires internet connectivity.

## Presentation target

The November 25 presentation target is a complete local RAG demonstration:

- Local frontend
- Local FastAPI backend
- Local PostgreSQL and pgvector
- Local document storage
- Local Ollama models
- Document upload and approval
- RAG retrieval and grounded answers
- Source display
- Basic login and chat history
- Demonstration from another device on the same Wi-Fi when available

Full migration of every administrative workflow can continue after the presentation if required.

## Estimated effort

| Scope | Estimated focused effort |
| --- | --- |
| Local RAG database and storage | 3–7 working days |
| Presentation-ready local system | 10–15 working days |
| Full application migration | 3–6 weeks |
| Production hardening, backups, and recovery testing | Additional 3–6 weeks |

## Current priority

Do not begin the full infrastructure migration until the RAG pipeline has been optimized and evaluated. The immediate work should focus on:

1. Extraction reliability and vision fallback.
2. Evaluation questions and measurable RAG tests.
3. Section-aware chunking.
4. Stronger local embeddings.
5. True hybrid retrieval.
6. Local reranking.
7. Re-indexing and regression testing.

Once the RAG behavior is stable, the local migration can preserve the improved pipeline instead of moving an unstable one.
