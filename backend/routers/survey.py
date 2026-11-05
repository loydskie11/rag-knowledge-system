from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from dependencies import get_current_faculty_or_admin, supabase
from permissions import filter_office_records

router = APIRouter(tags=["Client Satisfaction Survey"])

from datetime import datetime

@router.post("/api/css-responses", response_model=schemas.CssResponseOut)
@router.post("/css-responses", response_model=schemas.CssResponseOut)
def submit_css_response(req: schemas.CssResponseCreate, db: Session = Depends(get_db)):
    """Submits a Client Satisfaction Survey response and saves it to PostgreSQL / Supabase."""
    try:
        now_dt = datetime.utcnow()
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
    admin: models.User = Depends(get_current_faculty_or_admin)
):
    """Fetches all Client Satisfaction Survey responses (Admin only)."""
    try:
        return filter_office_records(admin, db.query(models.CssResponse).order_by(models.CssResponse.created_at.desc()).all(), "office_visited")
    except Exception as e:
        if supabase:
            try:
                res = supabase.table("css_responses").select("*").order("created_at", desc=True).execute()
                return filter_office_records(admin, res.data or [], "office_visited")
            except Exception as sb_err:
                raise HTTPException(status_code=500, detail=f"Failed to retrieve survey responses: {str(sb_err)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve survey responses: {str(e)}")
