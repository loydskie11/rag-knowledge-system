import os
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db

router = APIRouter(tags=["System Health & Diagnostics"])

@router.get("/health")
@router.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    """System health check verifying API uptime, database connectivity, and AI configuration."""
    db_status = "healthy"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    ai_base_url = os.getenv("AI_BASE_URL", "http://localhost:11434/v1")
    has_groq = bool(os.getenv("GROQ_API_KEY"))

    return {
        "status": "online",
        "timestamp": datetime.utcnow().isoformat(),
        "database": db_status,
        "ai_engine": {
            "local_ollama_url": ai_base_url,
            "cloud_groq_fallback_configured": has_groq
        }
    }
