from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from dependencies import get_current_user, supabase

router = APIRouter(tags=["Broadcast Announcements"])

@router.post("/announcements", response_model=schemas.AnnouncementResponse)
def create_announcement(announcement: schemas.AnnouncementCreate, db: Session = Depends(get_db)):
    """Creates a new broadcast announcement."""
    sent_dt = datetime.utcnow()
    
    if announcement.schedule_date:
        try:
            sent_dt = datetime.fromisoformat(announcement.schedule_date.replace("Z", "+00:00"))
        except ValueError:
            pass
            
    db_announcement = models.Announcement(
        title=announcement.title,
        content=announcement.content,
        recipients=announcement.recipients,
        sent_date=sent_dt,
        sent_by=announcement.sent_by,
        status=announcement.status,
        total_recipients=announcement.total_recipients
    )
    
    db.add(db_announcement)
    db.commit()
    db.refresh(db_announcement)
    
    # Silent audit event log
    if supabase:
        try:
            supabase.table("system_events_logs").insert({
                "user_email": announcement.sent_by,
                "event_type": "Broadcast Sent",
                "description": f"Broadcasted: {announcement.title} to {announcement.recipients}"
            }).execute()
        except Exception as e:
            print(f"Failed to log announcement event: {e}")

    return db_announcement

@router.get("/announcements", response_model=List[schemas.AnnouncementResponse])
def get_announcements(db: Session = Depends(get_db)):
    """Fetches all broadcast announcements, newest first."""
    return db.query(models.Announcement).order_by(models.Announcement.sent_date.desc()).all()

@router.get("/users/counts")
def get_user_counts(db: Session = Depends(get_db)):
    """Fetches real-time counts of active accounts for broadcast distribution."""
    students = db.query(models.User).filter(models.User.role == "STUDENT", models.User.status == "Active").count()
    faculty = db.query(models.User).filter(models.User.role == "FACULTY", models.User.status == "Active").count()
    admins = db.query(models.User).filter(models.User.role == "ADMIN", models.User.status == "Active").count()
    
    total = students + faculty + admins
    return {
        "all": total,
        "students": students,
        "faculty": faculty
    }

@router.put("/announcements/{announcement_id}", response_model=schemas.AnnouncementResponse)
def update_announcement(announcement_id: str, req: schemas.AnnouncementUpdate, db: Session = Depends(get_db)):
    """Updates an existing broadcast announcement."""
    announcement = db.query(models.Announcement).filter(models.Announcement.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
    
    announcement.title = req.title
    announcement.content = req.content
    announcement.recipients = req.recipients
    announcement.status = req.status
    announcement.total_recipients = req.total_recipients
    
    if req.schedule_date:
        try:
            announcement.sent_date = datetime.fromisoformat(req.schedule_date.replace("Z", "+00:00"))
        except ValueError:
            pass 
    elif req.status == "Sent":
        announcement.sent_date = datetime.utcnow()

    db.commit()
    db.refresh(announcement)
    return announcement

@router.delete("/announcements/{announcement_id}")
def delete_announcement(announcement_id: str, db: Session = Depends(get_db)):
    """Deletes a draft or pending announcement."""
    announcement = db.query(models.Announcement).filter(models.Announcement.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
    
    if announcement.status == "Sent":
        raise HTTPException(status_code=400, detail="Cannot delete an announcement that has already been sent.")
        
    db.delete(announcement)
    db.commit()
    return {"message": "Announcement deleted successfully."}

@router.post("/announcements/{announcement_id}/read")
def mark_announcement_read(announcement_id: str, db: Session = Depends(get_db)):
    """Increments the read count on a received announcement."""
    announcement = db.query(models.Announcement).filter(models.Announcement.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
    
    announcement.read_count = (announcement.read_count or 0) + 1
    db.commit()
    db.refresh(announcement)
    return {
        "id": str(announcement.id),
        "read_count": announcement.read_count,
        "total_recipients": announcement.total_recipients
    }
