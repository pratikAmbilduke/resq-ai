from datetime import datetime
import hashlib
import re
from typing import Optional

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db import SessionLocal, UserModel, EmergencyModel, ProfileModel, Base, engine


app = FastAPI(title="ResQ AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    print("✅ RESQ AI BACKEND LIVE WITH AI")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ================================
# UTILS
# ================================
def hash_password(password: str):
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(plain: str, hashed: str):
    return hashlib.sha256(plain.encode()).hexdigest() == hashed


def normalize_email(email: str):
    return (email or "").strip().lower()


def dt(v):
    return v.isoformat() if v else None


def clean_text(text):
    text = (text or "").lower().strip()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    return re.sub(r"\s+", " ", text)


def emergency_to_dict(e):
    return {
        "id": e.id,
        "user_id": e.user_id,
        "type": e.type,
        "description": e.description,
        "location_text": e.location_text,
        "latitude": e.latitude,
        "longitude": e.longitude,
        "status": e.status,
        "priority": e.priority,
        "accepted_by": e.accepted_by,
        "ai_summary": e.ai_summary,
        "created_at": dt(e.created_at),
        "updated_at": dt(e.updated_at),
    }


# ================================
# AI LOGIC (IMPROVED)
# ================================
def analyze_text(description: str, selected_type: str = "other"):
    desc = (description or "").lower()

    score = {
        "medical": 0,
        "fire": 0,
        "accident": 0,
        "crime": 0
    }

    # 🔴 CRITICAL CONDITIONS
    if any(x in desc for x in [
        "unconscious", "not breathing", "collapsed",
        "heart attack", "chest pain", "stroke", "seizure"
    ]):
        score["medical"] += 100

    # 🔥 FIRE
    if any(x in desc for x in ["fire", "smoke", "explosion", "burn"]):
        score["fire"] += 80

    # 🚗 ACCIDENT
    if any(x in desc for x in ["accident", "crash", "collision", "hit"]):
        score["accident"] += 70

    # 🚨 CRIME
    if any(x in desc for x in ["attack", "robbery", "fight", "gun"]):
        score["crime"] += 60

    # 🧠 SELECT BEST TYPE
    predicted_type = max(score, key=score.get)
    severity = score[predicted_type]

    # ⚡ PRIORITY BASED ON SCORE
    if severity >= 90:
        priority = "critical"
    elif severity >= 70:
        priority = "high"
    elif severity >= 40:
        priority = "medium"
    else:
        priority = "low"

    # 🚑 AUTO HELP SUGGESTION
    help_map = {
        "medical": ["ambulance"],
        "fire": ["fire brigade"],
        "accident": ["ambulance", "police"],
        "crime": ["police"]
    }

    suggested_help = help_map.get(predicted_type, [])

    # 🧾 SUMMARY
    ai_summary = f"{priority.capitalize()} {predicted_type} emergency detected"

    return {
        "predicted_type": predicted_type,
        "predicted_priority": priority,
        "severity": severity,
        "suggested_help": suggested_help,
        "ai_summary": ai_summary,
    }

# ================================
# MODELS
# ================================
class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class EmergencyRequest(BaseModel):
    type: str
    description: str
    latitude: float
    longitude: float
    location_text: str
    user_id: int


class StatusUpdateRequest(BaseModel):
    status: str
    accepted_by: Optional[str] = None


class PriorityUpdateRequest(BaseModel):
    priority: str


# ================================
# AUTH
# ================================
@app.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    email = normalize_email(req.email)

    if db.query(UserModel).filter(UserModel.email == email).first():
        return {"error": "Email exists"}

    role = "admin" if email == "admin@resqai.com" else "user"

    user = UserModel(
        name=req.name,
        email=email,
        password=hash_password(req.password),
        role=role,
        created_at=datetime.utcnow(),
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {"data": {"id": user.id, "role": user.role}}


@app.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    email = normalize_email(req.email)
    user = db.query(UserModel).filter(UserModel.email == email).first()

    if not user:
        return {"error": "Email not found"}

    if not verify_password(req.password, user.password):
        return {"error": "Wrong password"}

    return {"data": {"id": user.id, "role": user.role, "name": user.name}}


# ================================
# CREATE EMERGENCY
# ================================
@app.post("/emergency")
def create_emergency(req: EmergencyRequest, db: Session = Depends(get_db)):
    ai = analyze_text(req.description, req.type)

    e = EmergencyModel(
        type=ai["predicted_type"],
        description=req.description,
        latitude=req.latitude,
        longitude=req.longitude,
        location_text=req.location_text,
        user_id=req.user_id,
        status="pending",
        priority=ai["predicted_priority"],
        ai_summary=ai["ai_summary"],
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    db.add(e)
    db.commit()
    db.refresh(e)

    return {"data": emergency_to_dict(e)}

# ================================
# USER HISTORY
# ================================
@app.get("/emergencies/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db)):
    data = db.query(EmergencyModel).filter(EmergencyModel.user_id == user_id).all()
    return [emergency_to_dict(x) for x in data]


# ================================
# ADMIN ALL
# ================================
@app.get("/admin/emergencies/{user_id}")
def admin_all(user_id: int, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.id == user_id).first()

    if not user or user.role != "admin":
        return {"error": "Access denied"}

    data = db.query(EmergencyModel).order_by(EmergencyModel.id.desc()).all()
    return [emergency_to_dict(x) for x in data]


# ================================
# UPDATE STATUS
# ================================
@app.put("/emergency/{id}/status")
def update_status(id: int, req: StatusUpdateRequest, db: Session = Depends(get_db)):
    e = db.query(EmergencyModel).filter(EmergencyModel.id == id).first()

    if not e:
        return {"error": "Not found"}

    e.status = req.status
    e.accepted_by = req.accepted_by
    e.updated_at = datetime.utcnow()

    db.commit()
    return {"success": True}


# ================================
# PRIORITY
# ================================
@app.put("/admin/emergency/{id}/priority/{admin_id}")
def priority(id: int, admin_id: int, req: PriorityUpdateRequest, db: Session = Depends(get_db)):
    admin = db.query(UserModel).filter(UserModel.id == admin_id).first()

    if not admin or admin.role != "admin":
        return {"error": "Access denied"}

    e = db.query(EmergencyModel).filter(EmergencyModel.id == id).first()

    e.priority = req.priority
    db.commit()

    return {"success": True}


# ================================
# DELETE
# ================================
@app.delete("/admin/emergency/{id}/{admin_id}")
def delete(id: int, admin_id: int, db: Session = Depends(get_db)):
    admin = db.query(UserModel).filter(UserModel.id == admin_id).first()

    if not admin or admin.role != "admin":
        return {"error": "Access denied"}

    e = db.query(EmergencyModel).filter(EmergencyModel.id == id).first()
    db.delete(e)
    db.commit()

    return {"success": True}


# ================================
# HEALTH
# ================================
@app.get("/")
def root():
    return {"message": "Backend Running"}