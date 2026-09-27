# RAG-Based Governance & QA Accreditation System

A comprehensive, AI-powered Quality Assurance and Governance platform designed for higher education institutions (e.g., CTU). This system streamlines AACCUP, CHED, and ISO 9001:2015 accreditation processes, manages institutional knowledge via Retrieval-Augmented Generation (RAG), and automates document workflows using local and cloud-based Large Language Models.

## 🌟 Key Features

### 1. Accreditation Management
* **ISO 9001:2015 Standards:** Track ISO clause compliance, upload evidence, and manage Internal Quality Audit (IQA) schedules.
* **AACCUP & CHED Support:** Monitor program readiness, track validity periods, and evaluate compliance across all designated areas.
* **Corrective Action Requests (CAR):** Fully digitized CAR Form 1 and Logsheet (Form 3) workflow.
* **Institutional Scorecards:** Exportable CSV reports and real-time QA Readiness Index composite scoring.

### 2. AI & Document Automation
* **Smart OCR Extraction:** Uses PaddleOCR and a local `llama3.1` model (via Ollama) to automatically scan, extract, and map physical CAR forms into digital QMS Action Plans.
* **AI Document Generator:** Leverages Groq (`llama-3.3-70b-versatile`) to draft complex institutional memos, policies, and MRC forms instantly.
* **RAG Knowledge Repository:** Query institutional policies and manuals interactively using advanced vector search.

### 3. Secure Role-Based Access Control (RBAC)
* **Multi-Tiered Roles:** Distinct dashboards and permissions for `ADMIN`, `FACULTY` (with specific academic designations like Dean or Chair), and `STUDENT`.
* **Strict Email Integrity:** Email updates are protected by OTP verification. Admin controls allow system-wide user profile management.
* **Paper Trail:** Secure tracking of document routing and approvals restricted by department and administrative office.

## 🛠️ Technology Stack

**Frontend (React/Vite)**
* React 18 with TypeScript
* Vite for ultra-fast bundling
* Tailwind CSS for styling
* Lucide React for iconography
* Axios for API communication

**Backend (Python/FastAPI)**
* **Framework:** FastAPI with Uvicorn
* **Database:** PostgreSQL (hosted on Supabase) accessed via SQLAlchemy ORM
* **AI & Machine Learning:**
  * `Ollama` for local, privacy-first inference
  * `Groq` for high-speed cloud inference
  * `PaddleOCR` and `PyMuPDF` for computer vision and text extraction
  * `langchain` and `chromadb` (or Supabase Vector) for RAG pipelines

## 🚀 Getting Started

### Prerequisites
* **Node.js** (v18+)
* **Python** (3.10+)
* **PostgreSQL** database (Supabase recommended)
* **Ollama** installed locally with the `llama3.1` model downloaded (`ollama run llama3.1`)

### 1. Backend Setup
```bash
# Navigate to backend folder
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
# Create a .env file in the backend directory based on .env.example
# Ensure DATABASE_URL, GROQ_API_KEY, and AI_BASE_URL are set

# Run the FastAPI server
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
# Navigate to the project root
# Install Node dependencies
npm install

# Run the Vite development server
npm run dev
```

## 🔒 Environment Variables (`backend/.env`)
Your `.env` file should include the following keys:
* `DATABASE_URL` - Your Supabase PostgreSQL connection string
* `SECRET_KEY` - JWT signing key
* `GROQ_API_KEY` - Used for the AI Document Generator
* `AI_API_KEY="ollama"` - Used for local OCR inference
* `AI_BASE_URL="http://localhost:11434/v1"` - Ollama's local OpenAI-compatible endpoint

## 📝 License
This project is proprietary and confidential. Unauthorized copying of this file, via any medium, is strictly prohibited.
