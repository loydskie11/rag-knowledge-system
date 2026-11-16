from typing import List, Optional
import os
import threading
import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session
from supabase import create_client

import models
import schemas
from database import get_db
from dependencies import get_current_survey_analyst, supabase
from permissions import filter_survey_records

router = APIRouter(tags=["Client Satisfaction Survey"])

def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)

_sync_lock = threading.Lock()
_cloud_survey_url = os.getenv("CLOUD_SURVEY_SUPABASE_URL", "").strip().rstrip("/")
_cloud_survey_key = os.getenv("CLOUD_SURVEY_SUPABASE_SERVICE_KEY", "").strip()
_local_supabase_url = os.getenv("SUPABASE_URL", "").strip().rstrip("/")


def _cloud_survey_client():
    if not _cloud_survey_url or not _cloud_survey_key:
        return None
    if _cloud_survey_url == _local_supabase_url:
        return None
    return create_client(_cloud_survey_url, _cloud_survey_key)


def _parse_cloud_datetime(value) -> Optional[datetime]:
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    return datetime.fromisoformat(str(value).replace("Z", "+00:00"))


def _parse_cloud_date(value) -> Optional[date]:
    if not value:
        return None
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value)[:10])


def _sync_run_payload(run: Optional[models.SurveySyncRun], configured: bool) -> dict:
    if not run:
        return {"configured": configured, "status": "never", "last_sync": None}
    return {
        "configured": configured,
        "status": run.status,
        "last_sync": run.completed_at or run.started_at,
        "started_at": run.started_at,
        "completed_at": run.completed_at,
        "fetched_count": run.fetched_count,
        "inserted_count": run.inserted_count,
        "skipped_count": run.skipped_count,
        "error_message": run.error_message,
    }

@router.post("/api/css-responses", response_model=schemas.CssResponseOut)
@router.post("/css-responses", response_model=schemas.CssResponseOut)
def submit_css_response(req: schemas.CssResponseCreate, db: Session = Depends(get_db)):
    """Submits a Client Satisfaction Survey response and saves it to PostgreSQL / Supabase."""
    try:
        now_dt = utc_now()
        derived_year = req.survey_year
        if not derived_year:
            if req.date_of_service:
                try:
                    derived_year = int(str(req.date_of_service)[:4])
                except Exception:
                    derived_year = now_dt.year
            else:
                derived_year = now_dt.year

        derived_date = req.survey_date or (req.date_of_service if req.date_of_service else now_dt.date())

        new_response = models.CssResponse(
            survey_year=derived_year,
            survey_date=derived_date,
            client_type=req.client_type,
            date_of_service=req.date_of_service,
            gender=req.gender,
            age=req.age,
            region=req.region,
            service_availed=req.service_availed,
            campus=req.campus or "Argao",
            office_visited=req.office_visited,
            office_other=req.office_other,
            cc1=req.cc1,
            cc2=req.cc2,
            cc3=req.cc3,
            sqd0=req.sqd0,
            sqd1=req.sqd1,
            sqd2=req.sqd2,
            sqd3=req.sqd3,
            sqd4=req.sqd4,
            sqd5=req.sqd5,
            sqd6=req.sqd6,
            sqd7=req.sqd7,
            sqd8=req.sqd8,
            suggestions=req.suggestions,
            full_name=req.full_name,
            email=req.email
        )
        db.add(new_response)
        db.commit()
        db.refresh(new_response)
        return new_response
    except Exception as e:
        db.rollback()
        # Direct Supabase table fallback
        if supabase:
            try:
                payload = req.dict(exclude_unset=True)
                payload.setdefault("survey_year", derived_year)
                payload.setdefault("survey_date", str(derived_date))
                res = supabase.table("css_responses").insert(payload).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as sb_err:
                print(f"[Supabase CSS Insert Error]: {sb_err}")
        
        raise HTTPException(status_code=500, detail=f"Failed to submit survey response: {str(e)}")


@router.get("/api/css-responses", response_model=List[schemas.CssResponseOut])
@router.get("/css-responses", response_model=List[schemas.CssResponseOut])
def get_css_responses(
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_survey_analyst)
):
    """Fetches all Client Satisfaction Survey responses (Admin only)."""
    try:
        return filter_survey_records(admin, db.query(models.CssResponse).order_by(models.CssResponse.created_at.desc()).all(), "office_visited")
    except Exception as e:
        if supabase:
            try:
                res = supabase.table("css_responses").select("*").order("created_at", desc=True).execute()
                return filter_survey_records(admin, res.data or [], "office_visited")
            except Exception as sb_err:
                raise HTTPException(status_code=500, detail=f"Failed to retrieve survey responses: {str(sb_err)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve survey responses: {str(e)}")


@router.get("/api/css-responses/sync-status")
@router.get("/css-responses/sync-status")
def get_css_sync_status(
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_survey_analyst),
):
    """Return the latest one-way cloud-to-local survey synchronization result."""
    latest = (
        db.query(models.SurveySyncRun)
        .order_by(models.SurveySyncRun.started_at.desc())
        .first()
    )
    return _sync_run_payload(latest, _cloud_survey_client() is not None)


@router.post("/api/css-responses/sync")
@router.post("/css-responses/sync")
def sync_css_responses(
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_survey_analyst),
):
    """Pull cloud survey responses into local PostgreSQL without pushing local data."""
    cloud = _cloud_survey_client()
    if cloud is None:
        raise HTTPException(
            status_code=503,
            detail="Cloud survey synchronization is not configured on this server.",
        )
    if not _sync_lock.acquire(blocking=False):
        raise HTTPException(status_code=409, detail="A survey synchronization is already running.")

    run = models.SurveySyncRun(
        status="running",
        triggered_by=getattr(admin, "id", None),
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    try:
        latest_success = (
            db.query(models.SurveySyncRun)
            .filter(
                models.SurveySyncRun.status == "success",
                models.SurveySyncRun.id != run.id,
            )
            .order_by(models.SurveySyncRun.completed_at.desc())
            .first()
        )
        cursor = latest_success.max_cloud_created_at if latest_success else None
        fetched_rows: list[dict] = []
        page_size = 500
        page_start = 0

        while True:
            query = cloud.table("css_responses").select("*").order("created_at")
            if cursor:
                # Include the cursor timestamp again. Primary-key conflict
                # handling makes this overlap safe and prevents boundary loss.
                query = query.gte("created_at", cursor.isoformat())
            result = query.range(page_start, page_start + page_size - 1).execute()
            page = result.data or []
            fetched_rows.extend(page)
            if len(page) < page_size:
                break
            page_start += page_size

        allowed_columns = {column.name for column in models.CssResponse.__table__.columns}
        inserted_count = 0
        max_created_at = cursor

        for cloud_row in fetched_rows:
            payload = {key: value for key, value in cloud_row.items() if key in allowed_columns}
            if not payload.get("id"):
                continue
            payload["id"] = uuid.UUID(str(payload["id"]))
            if payload.get("created_at"):
                payload["created_at"] = _parse_cloud_datetime(payload["created_at"])
                if max_created_at is None or payload["created_at"] > max_created_at:
                    max_created_at = payload["created_at"]
            if payload.get("survey_date"):
                payload["survey_date"] = _parse_cloud_date(payload["survey_date"])

            statement = (
                pg_insert(models.CssResponse)
                .values(**payload)
                .on_conflict_do_nothing(index_elements=[models.CssResponse.id])
            )
            inserted_count += max(0, db.execute(statement).rowcount or 0)

        db.commit()
        run.status = "success"
        run.completed_at = datetime.now(timezone.utc)
        run.fetched_count = len(fetched_rows)
        run.inserted_count = inserted_count
        run.skipped_count = len(fetched_rows) - inserted_count
        run.max_cloud_created_at = max_created_at
        run.error_message = None
        db.commit()
        db.refresh(run)
        return _sync_run_payload(run, True)
    except Exception as exc:
        db.rollback()
        failed_run = db.query(models.SurveySyncRun).filter(models.SurveySyncRun.id == run.id).first()
        if failed_run:
            failed_run.status = "failed"
            failed_run.completed_at = datetime.now(timezone.utc)
            failed_run.error_message = str(exc)[:1000]
            db.commit()
            db.refresh(failed_run)
        raise HTTPException(
            status_code=503,
            detail="The cloud survey could not be reached. Existing local responses are still available.",
        ) from exc
    finally:
        _sync_lock.release()
