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
    print("✅ RESQ AI BACKEND LIVE")


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
    if not value:
        return None
    return value.isoformat()


def emergency_to_dict(e: EmergencyModel):
    return {
        "id": e.id,
        "user_id": e.user_id,
        "type": e.type or "other",
        "description": e.description or "",
        "location_text": e.location_text or "",
        "latitude": e.latitude,
        "longitude": e.longitude,
        "status": e.status or "pending",
        "priority": e.priority or "medium",
        "accepted_by": e.accepted_by,
        "ai_summary": e.ai_summary,
        "created_at": dt(e.created_at),
        "updated_at": dt(e.updated_at),
    }


# ================================
# AI LOGIC
# ================================
def analyze_text(description: str, selected_type: str = "other"):
    desc = (description or "").lower().strip()

    predicted_type = (selected_type or "other").lower()
    predicted_priority = "medium"

    if any(word in desc for word in ["fire", "smoke", "burn", "explosion"]):
        predicted_type = "fire"
        predicted_priority = "high"

    elif any(word in desc for word in ["accident", "crash", "collision", "road"]):
        predicted_type = "accident"
        predicted_priority = "high"

    elif any(word in desc for word in ["breathing", "unconscious", "collapsed", "heart"]):
        predicted_type = "medical"
        predicted_priority = "critical"

    ai_summary = f"AI detected {predicted_type} emergency with {predicted_priority} priority."

    return {
        "predicted_type": predicted_type,
        "predicted_priority": predicted_priority,
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


class StatusUpdateRequest(BaseModel):
    status: str
    accepted_by: Optional[str] = None


class PriorityUpdateRequest(BaseModel):
    priority: str

    # ================================
# EXTRA REQUEST MODELS
# ================================
class ProfileUpdateRequest(BaseModel):
    blood_group: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    medical_notes: Optional[str] = None
    address: Optional[str] = None


class LocationUpdateRequest(BaseModel):
    user_id: int
    latitude: float
    longitude: float


class AIAnalyzeRequest(BaseModel):
    description: str
    selected_type: Optional[str] = "other"


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
# AUTH ROUTES
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
        print("REGISTER ERROR:", str(e))
        return {"error": str(e)}


@app.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    try:
        email = normalize_email(req.email)
        password = req.password.strip()

        user = db.query(UserModel).filter(UserModel.email == email).first()

        if not user:
            return {"error": "Email not found"}

        if not verify_password(password, user.password):
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
        print("LOGIN ERROR:", str(e))
        return {"error": str(e)}


# ================================
# AI + EMERGENCY
# ================================
@app.post("/ai/analyze-emergency")
def analyze_emergency(req: AIAnalyzeRequest):
    try:
        return analyze_text(req.description, req.selected_type or "other")
    except Exception as e:
        return {"error": str(e)}


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
            "message": "Emergency created successfully",
            "data": emergency_to_dict(emergency),
        }

    except Exception as e:
        db.rollback()
        print("EMERGENCY ERROR:", str(e))
        return {"error": str(e)}
    
    # ================================
# USER EMERGENCIES
# ================================
@app.get("/emergencies/{user_id}")
def get_user_emergencies(user_id: int, db: Session = Depends(get_db)):
    try:
        emergencies = (
            db.query(EmergencyModel)
            .filter(EmergencyModel.user_id == user_id)
            .order_by(EmergencyModel.created_at.desc(), EmergencyModel.id.desc())
            .all()
        )

        return [emergency_to_dict(e) for e in emergencies]

    except Exception as e:
        print("USER HISTORY ERROR:", str(e))
        return {"error": str(e)}


# ================================
# ADMIN: ALL EMERGENCIES
# ================================
@app.get("/admin/emergencies/{user_id}")
def get_all_emergencies(user_id: int, db: Session = Depends(get_db)):
    try:
        user = db.query(UserModel).filter(UserModel.id == user_id).first()

        if not user or user.role != "admin":
            return {"error": "Access denied"}

        emergencies = (
            db.query(EmergencyModel)
            .order_by(EmergencyModel.created_at.desc(), EmergencyModel.id.desc())
            .all()
        )

        return [emergency_to_dict(e) for e in emergencies]

    except Exception as e:
        print("ADMIN FETCH ERROR:", str(e))
        return {"error": str(e)}


# ================================
# ADMIN: NEW EMERGENCIES (REAL-TIME)
# ================================
@app.get("/admin/new-emergencies/{last_id}/{user_id}")
def get_new_emergencies(last_id: int, user_id: int, db: Session = Depends(get_db)):
    try:
        user = db.query(UserModel).filter(UserModel.id == user_id).first()

        if not user or user.role != "admin":
            return {"error": "Access denied"}

        emergencies = (
            db.query(EmergencyModel)
            .filter(EmergencyModel.id > last_id)
            .order_by(EmergencyModel.created_at.desc(), EmergencyModel.id.desc())
            .all()
        )

        return [emergency_to_dict(e) for e in emergencies]

    except Exception as e:
        print("NEW EMERGENCY ERROR:", str(e))
        return {"error": str(e)}


# ================================
# UPDATE STATUS
# ================================
@app.put("/emergency/{emergency_id}/status")
def update_status(emergency_id: int, req: StatusUpdateRequest, db: Session = Depends(get_db)):
    try:
        emergency = db.query(EmergencyModel).filter(EmergencyModel.id == emergency_id).first()

        if not emergency:
            return {"error": "Emergency not found"}

        new_status = (req.status or "").strip().lower()
        allowed = ["pending", "accepted", "in progress", "resolved", "cancelled"]

        if new_status not in allowed:
            return {"error": "Invalid status"}

        emergency.status = new_status
        emergency.updated_at = datetime.utcnow()

        if new_status == "accepted":
            emergency.accepted_by = (req.accepted_by or "Admin").strip()
        elif new_status in ["pending", "cancelled"]:
            emergency.accepted_by = None

        db.commit()
        db.refresh(emergency)

        return {
            "success": True,
            "message": "Status updated",
            "emergency": emergency_to_dict(emergency),
        }

    except Exception as e:
        db.rollback()
        print("STATUS ERROR:", str(e))
        return {"error": str(e)}


# ================================
# UPDATE PRIORITY
# ================================
@app.put("/admin/emergency/{emergency_id}/priority/{admin_user_id}")
def update_priority(emergency_id: int, admin_user_id: int, req: PriorityUpdateRequest, db: Session = Depends(get_db)):
    try:
        admin = db.query(UserModel).filter(UserModel.id == admin_user_id).first()

        if not admin or admin.role != "admin":
            return {"error": "Access denied"}

        emergency = db.query(EmergencyModel).filter(EmergencyModel.id == emergency_id).first()

        if not emergency:
            return {"error": "Emergency not found"}

        priority = (req.priority or "").strip().lower()
        allowed = ["low", "medium", "high", "critical"]

        if priority not in allowed:
            return {"error": "Invalid priority"}

        emergency.priority = priority
        emergency.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(emergency)

        return {
            "success": True,
            "message": "Priority updated successfully",
            "emergency": emergency_to_dict(emergency),
        }

    except Exception as e:
        db.rollback()
        print("PRIORITY ERROR:", str(e))
        return {"error": str(e)}


# ================================
# DELETE EMERGENCY
# ================================
@app.delete("/admin/emergency/{emergency_id}/{admin_user_id}")
def delete_emergency(emergency_id: int, admin_user_id: int, db: Session = Depends(get_db)):
    try:
        admin = db.query(UserModel).filter(UserModel.id == admin_user_id).first()

        if not admin or admin.role != "admin":
            return {"error": "Access denied"}

        emergency = db.query(EmergencyModel).filter(EmergencyModel.id == emergency_id).first()

        if not emergency:
            return {"error": "Emergency not found"}

        db.delete(emergency)
        db.commit()

        return {
            "success": True,
            "message": "Emergency deleted successfully",
        }

    except Exception as e:
        db.rollback()
        print("DELETE ERROR:", str(e))
        return {"error": str(e)}


# ================================
# PROFILE APIs
# ================================
@app.get("/profile/{user_id}")
def get_profile(user_id: int, db: Session = Depends(get_db)):
    try:
        profile = db.query(ProfileModel).filter(ProfileModel.user_id == user_id).first()

        if not profile:
            return {}

        return {
            "id": profile.id,
            "user_id": profile.user_id,
            "blood_group": profile.blood_group,
            "emergency_contact_phone": profile.emergency_contact_phone,
            "medical_notes": profile.medical_notes,
            "address": profile.address,
        }

    except Exception as e:
        return {"error": str(e)}


@app.put("/profile/{user_id}")
def update_profile(user_id: int, req: ProfileUpdateRequest, db: Session = Depends(get_db)):
    try:
        profile = db.query(ProfileModel).filter(ProfileModel.user_id == user_id).first()

        if not profile:
            profile = ProfileModel(user_id=user_id)
            db.add(profile)

        profile.blood_group = req.blood_group
        profile.emergency_contact_phone = req.emergency_contact_phone
        profile.medical_notes = req.medical_notes
        profile.address = req.address
        profile.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(profile)

        return {"success": True, "message": "Profile updated"}

    except Exception as e:
        db.rollback()
        return {"error": str(e)}


# ================================
# LOCATION APIs
# ================================
@app.post("/update-location")
def update_location(req: LocationUpdateRequest, db: Session = Depends(get_db)):
    try:
        user = db.query(UserModel).filter(UserModel.id == req.user_id).first()

        if not user:
            return {"error": "User not found"}

        user.latitude = req.latitude
        user.longitude = req.longitude

        db.commit()
        db.refresh(user)

        return {"success": True, "message": "Location updated"}

    except Exception as e:
        db.rollback()
        return {"error": str(e)}


@app.get("/all-locations")
def get_all_locations(db: Session = Depends(get_db)):
    try:
        emergencies = (
            db.query(EmergencyModel)
            .filter(EmergencyModel.latitude.isnot(None))
            .all()
        )

        return [
            {
                "id": e.id,
                "latitude": e.latitude,
                "longitude": e.longitude,
                "type": e.type,
                "priority": e.priority,
            }
            for e in emergencies
        ]

    except Exception as e:
        return {"error": str(e)}
    
    