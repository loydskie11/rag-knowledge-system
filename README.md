# CTU Institutional Knowledge & Governance System

An institutional quality-assurance platform for Cebu Technological University (CTU) Argao Campus. The system combines a role-based web application, accreditation and ISO/QMS workflows, document governance, a searchable institutional knowledge base, and AI-assisted policy and document tools.

## What the system can do

### Institutional knowledge and RAG assistant

- Upload and manage institutional documents and new document versions.
- Accept PDF, PNG/JPG, TXT, DOCX, and HTML/HTM uploads up to 50 MiB.
- Extract text from born-digital and scanned PDFs using PyMuPDF, PaddleOCR, and an optional local vision model fallback.
- Clean OCR output, split it into overlapping semantic chunks, and create `all-MiniLM-L6-v2` embeddings.
- Store files in Supabase Storage and searchable chunks in Supabase/Postgres vector storage.
- Answer policy questions through semantic vector search with keyword fallback, source metadata, confidence/evidence scoring, chat history, and user feedback.
- Keep templates and branding assets out of the RAG corpus while still making them available to document-generation workflows.
- Track document status, approval, versions, archival, access, and background processing progress.

### Quality assurance and accreditation

- Track AACCUP requirements by area and program accreditation status, history, levels, validity, milestones, and certificates.
- Manage CHED requirements, evidence uploads, review status, and administrator feedback.
- Manage ISO 9001 requirements by clause, risk level, program, auditee office, and audit cycle.
- Schedule IQA audit days and scopes.
- Create and track QMS action plans, corrective measures, target dates, completion, assessment notes, and evidence.
- Create, edit, review, and delete CAR forms, including CAR Form 1/Form 3 template workflows.
- Upload accreditation, ISO, CHED, QMS, and historical certificate evidence with approval/review states.
- Generate readiness and accreditation summaries for administrative users.

### Document workflows and productivity

- Track routed documents with unique paper-trail numbers, offices, senders, recipients, locations, status changes, remarks, attachments, and movement history.
- Support bottom-up submissions and top-down document requests.
- Generate institutional documents from templates and AI-assisted prompts.
- Convert and preserve DOCX/PDF structure, tables, styles, images, headers, footers, and branding assets for editable document output.
- Evaluate uploaded grade slips and produce structured grade/evaluation results.
- Broadcast announcements and maintain in-app notifications.

### Surveys and analytics

- Collect Client Satisfaction Survey responses.
- Provide administrator/faculty survey analytics with KPI cards, filters, tables, and charts for client type, campus, office, service, demographics, response timelines, CC responses, and SQD scores.
- Provide dashboard statistics, recent questions, popular topics, and other operational summaries.

### Access control and governance safeguards

- Role-based access for `ADMIN`, `FACULTY`, and `STUDENT` users.
- Email OTP verification, password reset, profile updates, password changes, user verification, enable/disable controls, and role/profile administration.
- JWT authentication using secure cookies and/or authorization headers, with CSRF checks for cookie-authenticated mutations.
- Department and administrative-office-aware access rules for governance workflows.
- Audit logs for queries, document access, system events, versions, approvals, and routed-document activity.
- Prompt sanitization, prompt-injection detection, rate limiting, upload extension/signature checks, file-size limits, security headers, and evidence-grounding evaluation.
- Short-lived signed URLs for private document files.

## Main application areas

The React application exposes these role-protected areas under `/app`:

| Area | Purpose |
| --- | --- |
| Dashboard | Role-specific operational overview |
| Knowledge Repository | Upload, search, approve, version, and archive documents |
| AI Assistant / Ask Policy | Evidence-grounded questions over approved institutional knowledge |
| Accreditation Support | AACCUP, CHED, ISO, IQA, CAR, and QMS workflows |
| Governance Reference | Governance and policy reference material |
| Document Tracking / Paper Trail | Route, request, receive, review, and release documents |
| Document Generator | Template-driven and AI-assisted document creation |
| Grade Evaluation | Grade-slip upload and evaluation |
| Client Survey | Submit satisfaction survey responses |
| Survey Analytics | Analyze survey responses (admin/faculty) |
| Audit Trail | Review governance, access, query, version, and system events |
| Users & Roles | Admin user and access management |
| Announcements | Broadcast and manage institutional announcements |
| Settings / Profile | System and personal account settings |

## Architecture

```text
React + TypeScript + Vite + Tailwind/MUI
                    |
             Axios / REST API
                    |
FastAPI + SQLAlchemy + background document workers
        |                 |                 |
   PostgreSQL         Supabase Storage   Ollama / Groq
   + pgvector          private files       local/cloud AI
```

- `src/` contains the React/Vite frontend.
- `backend/` contains the FastAPI API, SQLAlchemy models, RAG pipeline, OCR/document processing, and routers.
- `supabase/` contains database/storage hardening SQL.
- `ctu-survey-app/` and `docGenerator/` contain related/supporting application assets; the root application is the primary frontend/backend described above.

## Technology stack

**Frontend:** React 18, TypeScript, Vite, React Router, Tailwind CSS, Material UI, Radix UI, Axios, Recharts, React Markdown, `docx`, jsPDF.

**Backend:** Python 3.12, FastAPI, Uvicorn, SQLAlchemy, Pydantic, PostgreSQL, Supabase Python client, PyMuPDF, PyPDF2, python-docx, Pillow, PaddleOCR, NumPy, Sentence Transformers.

**AI:** Ollama through an OpenAI-compatible local endpoint for private/local inference and OCR/vision support; Groq for cloud-assisted document generation or fallback flows.

## Local development

### Prerequisites

- Node.js 18 or newer and npm.
- Python 3.12 recommended.
- A Supabase project with PostgreSQL, Storage, and the vector-search function/table used by the backend.
- Ollama installed locally with the model configured by your environment (the defaults use `http://localhost:11434/v1`).
- Optional: a Groq API key for cloud document-generation/fallback functionality.
- Optional: SMTP credentials for OTP and password-reset email.

### Configure environment variables

Create a local `.env` file. Never commit credentials or copy production secrets into the repository.

```dotenv
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/<database>
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_KEY=<server-side-service-key>
SECRET_KEY=<long-random-jwt-secret>

AI_API_KEY=ollama
AI_BASE_URL=http://localhost:11434/v1
GROQ_API_KEY=<optional-groq-key>

EMAIL_ADDRESS=<optional-smtp-sender>
EMAIL_APP_PASSWORD=<optional-smtp-app-password>
# Optional overrides:
# EMAIL_SMTP_HOST=smtp.gmail.com
# EMAIL_SMTP_PORT=465
# ALLOWED_ORIGINS=http://localhost:5173
# COOKIE_SECURE=false
```

Apply the SQL in `supabase/security_hardening.sql` to the Supabase project when setting up storage security. Ensure the `documents` bucket and the vector-search database objects expected by `backend/vector_store.py` are available.

### Start the backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The API exposes health checks at `http://localhost:8000/health` and `http://localhost:8000/api/health`. FastAPI documentation is available at `http://localhost:8000/docs` while the server is running.

### Start the frontend

From the repository root:

```powershell
npm install
npm run dev
```

Open the Vite URL shown in the terminal, normally `http://localhost:5173`. Vite proxies `/api` requests to `http://localhost:8000` during development.

### Build for production

```powershell
npm run build
npm run preview
```

The root `Dockerfile` builds the frontend and serves it with Nginx. `docker-compose.yml` starts the backend and frontend containers; the backend container reaches host Ollama through `host.docker.internal`.

## Testing

The backend includes focused tests for RAG policy filtering, evidence/answer evaluation, input sanitization and prompt-injection detection, rate limiting, and database connectivity.

```powershell
cd backend
pytest
```

## Important operational notes

- AI answers are grounded in approved, non-archived repository content; users should still verify high-stakes policy or accreditation decisions with the responsible office.
- OCR and embedding run asynchronously after upload. A document can be stored successfully before it becomes searchable.
- Forms/templates and branding assets intentionally bypass vector indexing.
- The backend expects a configured database and Supabase credentials at startup; a clean deployment must provide these values through a secret manager or environment configuration.
- Replace any leaked or previously shared credentials before deploying this repository.

## License

This project is proprietary and confidential. Unauthorized copying, redistribution, or use is prohibited.
