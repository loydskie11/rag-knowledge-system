from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from dependencies import get_current_admin, get_current_user, supabase


router = APIRouter(tags=["Broadcast Announcements"])


def _rollback(db: Session) -> None:
    try:
        db.rollback()
    except Exception:
        pass


def _require_supabase():
    if not supabase:
        raise HTTPException(status_code=503, detail="Announcement service is temporarily unavailable.")
    return supabase


def _sent_date(schedule_date: str | None, *, default_now: bool = True) -> datetime | None:
    if schedule_date:
        try:
            return datetime.fromisoformat(schedule_date.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid announcement schedule date.")
    return datetime.utcnow() if default_now else None


@router.post("/announcements", response_model=schemas.AnnouncementResponse)
def create_announcement(
    announcement: schemas.AnnouncementCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    """Create an announcement using the authenticated administrator as its sender."""
    sent_dt = _sent_date(announcement.schedule_date)
    sender_email = admin.email
    result = None

    try:
        result = models.Announcement(
            title=announcement.title,
            content=announcement.content,
            recipients=announcement.recipients,
            sent_date=sent_dt,
            sent_by=sender_email,
            status=announcement.status,
            total_recipients=announcement.total_recipients,
        )
        db.add(result)
        db.commit()
        db.refresh(result)
    except Exception:
        _rollback(db)
        payload = {
            "title": announcement.title,
            "content": announcement.content,
            "recipients": announcement.recipients,
            "sent_date": sent_dt.isoformat(),
            "sent_by": sender_email,
            "status": announcement.status,
            "total_recipients": announcement.total_recipients,
            "read_count": 0,
        }
        try:
            response = _require_supabase().table("announcements").insert(payload).execute()
            if not response.data:
                raise RuntimeError("No announcement was returned after insertion.")
            result = response.data[0]
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=503, detail="Unable to create the announcement.") from exc

    try:
        _require_supabase().table("system_events_logs").insert({
            "user_email": sender_email,
            "event_type": "Broadcast Sent",
            "description": f"Broadcasted: {announcement.title} to {announcement.recipients}",
        }).execute()
    except Exception:
        # Audit logging must not turn an otherwise successful broadcast into a failure.
        pass

    return result


@router.get("/announcements", response_model=List[schemas.AnnouncementResponse])
def get_announcements(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Fetch broadcast announcements for authenticated users, newest first."""
    try:
        return db.query(models.Announcement).order_by(models.Announcement.sent_date.desc()).all()
    except Exception:
        _rollback(db)
        try:
            response = _require_supabase().table("announcements").select("*").order("sent_date", desc=True).execute()
            return response.data or []
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=503, detail="Unable to load announcements.") from exc


@router.get("/users/counts")
def get_user_counts(
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    """Return active-account counts used by the System Administrator broadcast UI."""
    try:
        students = db.query(models.User).filter(models.User.role == "STUDENT", models.User.status == "Active").count()
        personnel = db.query(models.User).filter(models.User.role == "PERSONNEL", models.User.status == "Active").count()
        administrators = db.query(models.User).filter(models.User.role == "SYSTEM_ADMIN", models.User.status == "Active").count()
    except Exception:
        _rollback(db)
        students = personnel = administrators = 0
        try:
            response = _require_supabase().table("users").select("role, status").eq("status", "Active").execute()
            for account in response.data or []:
                role = (account.get("role") or "").upper()
                if role == "STUDENT":
                    students += 1
                elif role == "PERSONNEL":
                    personnel += 1
                elif role == "SYSTEM_ADMIN":
                    administrators += 1
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=503, detail="Unable to load user counts.") from exc

    return {
        "all": students + personnel + administrators,
        "students": students,
        "faculty": personnel,
    }


@router.put("/announcements/{announcement_id}", response_model=schemas.AnnouncementResponse)
def update_announcement(
    announcement_id: str,
    req: schemas.AnnouncementUpdate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    """Update a broadcast announcement as a System Administrator."""
    update_data = {
        "title": req.title,
        "content": req.content,
        "recipients": req.recipients,
        "status": req.status,
        "total_recipients": req.total_recipients,
    }
    if req.schedule_date:
        update_data["sent_date"] = _sent_date(req.schedule_date).isoformat()
    elif req.status == "Sent":
        update_data["sent_date"] = datetime.utcnow().isoformat()

    try:
        record = db.query(models.Announcement).filter(models.Announcement.id == announcement_id).first()
        if not record:
            raise HTTPException(status_code=404, detail="Announcement not found")
        record.title = req.title
        record.content = req.content
        record.recipients = req.recipients
        record.status = req.status
        record.total_recipients = req.total_recipients
        if "sent_date" in update_data:
            record.sent_date = datetime.fromisoformat(update_data["sent_date"])
        db.commit()
        db.refresh(record)
        return record
    except HTTPException:
        raise
    except Exception:
        _rollback(db)

    try:
        response = _require_supabase().table("announcements").update(update_data).eq("id", announcement_id).execute()
        if response.data:
            return response.data[0]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Unable to update the announcement.") from exc
    raise HTTPException(status_code=404, detail="Announcement not found")


@router.delete("/announcements/{announcement_id}")
def delete_announcement(
    announcement_id: str,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    """Delete a draft or scheduled announcement as a System Administrator."""
    try:
        record = db.query(models.Announcement).filter(models.Announcement.id == announcement_id).first()
        if not record:
            raise HTTPException(status_code=404, detail="Announcement not found")
        if record.status == "Sent":
            raise HTTPException(status_code=400, detail="Cannot delete an announcement that has already been sent.")
        db.delete(record)
        db.commit()
        return {"message": "Announcement deleted successfully."}
    except HTTPException:
        raise
    except Exception:
        _rollback(db)

    try:
        client = _require_supabase()
        response = client.table("announcements").select("status").eq("id", announcement_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Announcement not found")
        if response.data[0].get("status") == "Sent":
            raise HTTPException(status_code=400, detail="Cannot delete an announcement that has already been sent.")
        client.table("announcements").delete().eq("id", announcement_id).execute()
        return {"message": "Announcement deleted successfully."}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Unable to delete the announcement.") from exc


@router.post("/announcements/{announcement_id}/read")
def mark_announcement_read(
    announcement_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Record an announcement read for an authenticated account."""
    try:
        record = db.query(models.Announcement).filter(models.Announcement.id == announcement_id).first()
        if not record:
            raise HTTPException(status_code=404, detail="Announcement not found")
        record.read_count = (record.read_count or 0) + 1
        db.commit()
        db.refresh(record)
        return {
            "id": str(record.id),
            "read_count": record.read_count,
            "total_recipients": record.total_recipients,
        }
    except HTTPException:
        raise
    except Exception:
        _rollback(db)

    try:
        client = _require_supabase()
        response = client.table("announcements").select("read_count, total_recipients").eq("id", announcement_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Announcement not found")
        new_count = (response.data[0].get("read_count") or 0) + 1
        client.table("announcements").update({"read_count": new_count}).eq("id", announcement_id).execute()
        return {
            "id": announcement_id,
            "read_count": new_count,
            "total_recipients": response.data[0].get("total_recipients") or 0,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Unable to record the announcement read.") from exc
