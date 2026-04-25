from datetime import datetime
import hashlib
from typing import Optional

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db import SessionLocal, UserModel, EmergencyModel, ProfileModel, Base, engine


# ================================
# APP INIT
# ================================
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
    print("🔥 NEW AI VERSION LOADED 🔥")


# ================================
# DB SESSION
# ================================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ================================
# UTIL FUNCTIONS
# ================================
def hash_password(password: str):
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(plain: str, hashed: str):
    return hashlib.sha256(plain.encode()).hexdigest() == hashed


def normalize_email(email: str):
    return (email or "").strip().lower()


def dt(value):
    return value.isoformat() if value else None


def emergency_to_dict(e: EmergencyModel):
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
# AI LOGIC (UPGRADED)
# ================================
def analyze_text(description: str, selected_type: str = "other"):
    desc = (description or "").lower()

    score = {
        "medical": 0,
        "fire": 0,
        "accident": 0,
        "crime": 0
    }

    # MEDICAL (CRITICAL)
    if any(x in desc for x in ["breathing", "unconscious", "heart", "chest pain", "collapsed"]):
        score["medical"] += 100

    # FIRE
    if any(x in desc for x in ["fire", "smoke", "burn", "explosion"]):
        score["fire"] += 80

    # ACCIDENT
    if any(x in desc for x in ["accident", "crash", "collision", "road"]):
        score["accident"] += 70

    # CRIME
    if any(x in desc for x in ["attack", "fight", "weapon", "robbery"]):
        score["crime"] += 60

    predicted_type = max(score, key=score.get)
    severity_score = score[predicted_type]

    # PRIORITY
    if severity_score >= 90:
        priority = "critical"
    elif severity_score >= 70:
        priority = "high"
    elif severity_score >= 40:
        priority = "medium"
    else:
        priority = "low"

    ai_summary = f"{priority.upper()} {predicted_type} emergency detected"

    return {
        "predicted_type": predicted_type,
        "predicted_priority": priority,
        "severity_score": severity_score,
        "ai_summary": ai_summary,
    }


# ================================
# REQUEST MODELS
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


class AIAnalyzeRequest(BaseModel):
    description: str
    selected_type: Optional[str] = "other"

    # ================================
# EXTRA REQUEST MODELS
# ================================
class StatusUpdateRequest(BaseModel):
    status: str
    accepted_by: Optional[str] = None


class PriorityUpdateRequest(BaseModel):
    priority: str


class ProfileUpdateRequest(BaseModel):
    blood_group: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    medical_notes: Optional[str] = None
    address: Optional[str] = None


class LocationUpdateRequest(BaseModel):
    user_id: int
    latitude: float
    longitude: float


# ================================
# BASIC ROUTES
# ================================
@app.get("/")
def root():
    return {"message": "RESQ AI BACKEND LIVE ✅"}


@app.get("/health")
def health():
    return {"status": "ok"}


# ================================
# AI ROUTE (IMPORTANT)
# ================================
@app.post("/ai/analyze-emergency")
def analyze_emergency(req: AIAnalyzeRequest):
    try:
        result = analyze_text(req.description, req.selected_type or "other")
        return {"success": True, "data": result}
    except Exception as e:
        return {"error": str(e)}


# ================================
# AUTH
# ================================
@app.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    try:
        email = normalize_email(req.email)

        if not req.name.strip() or not email or not req.password.strip():
            return {"error": "All fields are required"}

        existing = db.query(UserModel).filter(UserModel.email == email).first()
        if existing:
            return {"error": "Email already exists"}

        role = "admin" if email == "admin@resqai.com" else "user"

        user = UserModel(
            name=req.name.strip(),
            email=email,
            password=hash_password(req.password.strip()),
            role=role,
            created_at=datetime.utcnow(),
        )

        db.add(user)
        db.commit()
        db.refresh(user)

        return {
            "success": True,
            "message": "Registered successfully",
            "data": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
            },
        }

    except Exception as e:
        db.rollback()
        return {"error": str(e)}


@app.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    try:
        email = normalize_email(req.email)
        user = db.query(UserModel).filter(UserModel.email == email).first()

        if not user:
            return {"error": "Email not found"}

        if not verify_password(req.password.strip(), user.password):
            return {"error": "Wrong password"}

        return {
            "success": True,
            "message": "Login success",
            "data": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
            },
        }

    except Exception as e:
        return {"error": str(e)}


# ================================
# EMERGENCY CREATE (AI APPLIED)
# ================================
@app.post("/emergency")
def create_emergency(req: EmergencyRequest, db: Session = Depends(get_db)):
    try:
        user = db.query(UserModel).filter(UserModel.id == req.user_id).first()
        if not user:
            return {"error": "User not found"}

        ai = analyze_text(req.description, req.type)

        emergency = EmergencyModel(
            type=ai["predicted_type"],
            description=req.description,
            latitude=req.latitude,
            longitude=req.longitude,
            location_text=req.location_text,
            user_id=req.user_id,
            status="pending",
            accepted_by=None,
            priority=ai["predicted_priority"],
            ai_summary=ai["ai_summary"],
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        db.add(emergency)
        db.commit()
        db.refresh(emergency)

        return {
            "success": True,
            "message": "Emergency created",
            "data": emergency_to_dict(emergency),
        }

    except Exception as e:
        db.rollback()
        return {"error": str(e)}


# ================================
# USER HISTORY
# ================================
@app.get("/emergencies/{user_id}")
def get_user_emergencies(user_id: int, db: Session = Depends(get_db)):
    try:
        emergencies = (
            db.query(EmergencyModel)
            .filter(EmergencyModel.user_id == user_id)
            .order_by(EmergencyModel.created_at.desc())
            .all()
        )
        return {"success": True, "data": [emergency_to_dict(e) for e in emergencies]}
    except Exception as e:
        return {"error": str(e)}


# ================================
# ADMIN ALL
# ================================
@app.get("/admin/emergencies/{user_id}")
def get_all_emergencies(user_id: int, db: Session = Depends(get_db)):
    try:
        user = db.query(UserModel).filter(UserModel.id == user_id).first()

        if not user or user.role != "admin":
            return {"error": "Access denied"}

        emergencies = db.query(EmergencyModel).order_by(EmergencyModel.created_at.desc()).all()

        return {"success": True, "data": [emergency_to_dict(e) for e in emergencies]}

    except Exception as e:
        return {"error": str(e)}


# ================================
# DELETE
# ================================
@app.delete("/admin/emergency/{emergency_id}/{admin_user_id}")
def delete_emergency(emergency_id: int, admin_user_id: int, db: Session = Depends(get_db)):
    try:
        admin = db.query(UserModel).filter(UserModel.id == admin_user_id).first()

        if not admin or admin.role != "admin":
            return {"error": "Access denied"}

        emergency = db.query(EmergencyModel).filter(EmergencyModel.id == emergency_id).first()

        if not emergency:
            return {"error": "Not found"}

        db.delete(emergency)
        db.commit()

        return {"success": True, "message": "Deleted"}

    except Exception as e:
        db.rollback()
        return {"error": str(e)}