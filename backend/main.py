from datetime import datetime
import hashlib
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db import SessionLocal, UserModel, EmergencyModel, ProfileModel, Base, engine

app = FastAPI()

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


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def hash_password(password: str):
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(plain: str, hashed: str):
    return hashlib.sha256(plain.encode()).hexdigest() == hashed


def normalize_email(email: str) -> str:
    return (email or "").strip().lower()


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
        "created_at": e.created_at,
        "updated_at": e.updated_at,
    }


def analyze_text(description: str, selected_type: str):
    desc = (description or "").lower().strip()
    predicted_type = (selected_type or "other").lower()
    predicted_priority = "medium"

    if any(word in desc for word in ["fire", "smoke", "burn", "burning", "blast", "explosion"]):
        predicted_type = "fire"
        predicted_priority = "high"

    elif any(word in desc for word in ["accident", "crash", "bike", "car", "collision", "truck", "road"]):
        predicted_type = "accident"
        predicted_priority = "high"

    elif any(word in desc for word in [
        "breathing", "not breathing", "collapsed", "collapse", "unconscious",
        "heart", "chest pain", "stroke", "seizure", "bleeding", "blood",
        "shortness of breath", "sweating", "dizziness"
    ]):
        predicted_type = "medical"
        predicted_priority = "critical"

    elif any(word in desc for word in ["injury", "fracture", "broken", "hurt", "fever", "pain"]):
        if predicted_type not in ["medical", "accident"]:
            predicted_type = "medical"
        predicted_priority = "high"

    ai_summary = f"Emergency reported: {description[:120].strip()}" if description else "Emergency reported"

    return {
        "predicted_type": predicted_type,
        "predicted_priority": predicted_priority,
        "ai_summary": ai_summary,
    }


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


@app.get("/")
def root():
    return {"message": "RESQ AI BACKEND LIVE ✅"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    email = normalize_email(req.email)

    existing = db.query(UserModel).filter(UserModel.email.ilike(email)).first()
    if existing:
        return {"error": "Email already exists"}

    role = "admin" if email == "admin@resqai.com" else "user"

    user = UserModel(
        name=req.name.strip(),
        email=email,
        password=hash_password(req.password.strip()),
        role=role,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "message": "Registered successfully",
        "data": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
        },
    }


@app.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    email = normalize_email(req.email)
    password = req.password.strip()

    print("LOGIN TRY:", email)

    user = db.query(UserModel).filter(UserModel.email.ilike(email)).first()

    print("USER FOUND:", user.email if user else None)

    if not user:
        return {"error": "Email not found"}

    if not verify_password(password, user.password):
        return {"error": "Wrong password"}

    return {
        "message": "Login success",
        "data": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
        },
    }


@app.post("/ai/analyze-emergency")
def analyze_emergency(req: AIAnalyzeRequest):
    return analyze_text(req.description, req.selected_type or "other")


@app.post("/emergency")
def create_emergency(req: EmergencyRequest, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.id == req.user_id).first()
    if not user:
        return {"error": "User not found"}

    ai_result = analyze_text(req.description, req.type)

    predicted_type = ai_result["predicted_type"]
    predicted_priority = ai_result["predicted_priority"]
    ai_summary = ai_result["ai_summary"]

    emergency = EmergencyModel(
        type=predicted_type,
        description=req.description,
        latitude=req.latitude,
        longitude=req.longitude,
        location_text=req.location_text,
        user_id=req.user_id,
        status="pending",
        accepted_by=None,
        priority=predicted_priority,
        ai_summary=ai_summary,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    db.add(emergency)
    db.commit()
    db.refresh(emergency)

    print("NEW EMERGENCY SAVED:", emergency.id, emergency.type, emergency.priority)

    return {
        "message": "Emergency created successfully",
        "data": emergency_to_dict(emergency),
    }


@app.get("/emergencies/{user_id}")
def get_user_emergencies(user_id: int, db: Session = Depends(get_db)):
    emergencies = (
        db.query(EmergencyModel)
        .filter(EmergencyModel.user_id == user_id)
        .order_by(EmergencyModel.created_at.desc(), EmergencyModel.id.desc())
        .all()
    )
    return [emergency_to_dict(e) for e in emergencies]


@app.get("/admin/emergencies/{user_id}")
def get_all_emergencies(user_id: int, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.id == user_id).first()

    if not user or user.role != "admin":
        return {"error": "Access denied"}

    emergencies = (
        db.query(EmergencyModel)
        .order_by(EmergencyModel.created_at.desc(), EmergencyModel.id.desc())
        .all()
    )

    print("ADMIN FETCH COUNT:", len(emergencies))

    return [emergency_to_dict(e) for e in emergencies]


@app.get("/admin/new-emergencies/{last_id}/{user_id}")
def get_new_emergencies(last_id: int, user_id: int, db: Session = Depends(get_db)):
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


@app.put("/emergency/{emergency_id}/status")
def update_status(emergency_id: int, req: StatusUpdateRequest, db: Session = Depends(get_db)):
    emergency = db.query(EmergencyModel).filter(EmergencyModel.id == emergency_id).first()

    if not emergency:
        raise HTTPException(status_code=404, detail="Emergency not found")

    allowed_statuses = ["pending", "accepted", "in progress", "resolved", "cancelled"]
    new_status = (req.status or "").strip().lower()

    if new_status not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")

    emergency.status = new_status
    emergency.updated_at = datetime.utcnow()

    if new_status == "accepted":
        emergency.accepted_by = (req.accepted_by or "").strip()
    elif new_status in ["pending", "cancelled"]:
        emergency.accepted_by = None

    db.commit()
    db.refresh(emergency)

    return {
        "success": True,
        "message": "Status updated",
        "emergency": emergency_to_dict(emergency),
    }


@app.put("/admin/emergency/{emergency_id}/priority/{admin_user_id}")
def update_priority(
    emergency_id: int,
    admin_user_id: int,
    req: PriorityUpdateRequest,
    db: Session = Depends(get_db),
):
    admin_user = db.query(UserModel).filter(UserModel.id == admin_user_id).first()

    if not admin_user or admin_user.role != "admin":
        return {"error": "Access denied"}

    emergency = db.query(EmergencyModel).filter(EmergencyModel.id == emergency_id).first()

    if not emergency:
        return {"error": "Emergency not found"}

    new_priority = (req.priority or "").strip().lower()
    allowed_priorities = ["low", "medium", "high", "critical"]

    if new_priority not in allowed_priorities:
        return {"error": "Invalid priority"}

    emergency.priority = new_priority
    emergency.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(emergency)

    return {
        "success": True,
        "message": "Priority updated successfully",
        "emergency": emergency_to_dict(emergency),
    }


@app.delete("/admin/emergency/{emergency_id}/{admin_user_id}")
def delete_emergency(emergency_id: int, admin_user_id: int, db: Session = Depends(get_db)):
    admin_user = db.query(UserModel).filter(UserModel.id == admin_user_id).first()

    if not admin_user or admin_user.role != "admin":
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


@app.get("/provider-location/{emergency_id}")
def get_provider_location(emergency_id: int, db: Session = Depends(get_db)):
    emergency = db.query(EmergencyModel).filter(EmergencyModel.id == emergency_id).first()

    if not emergency:
        return {"error": "Emergency not found"}

    if not emergency.accepted_by:
        return {"message": "No provider assigned yet"}

    provider = db.query(UserModel).filter(UserModel.name == emergency.accepted_by).first()

    if not provider:
        return {"error": "Assigned provider not found"}

    if provider.latitude is None or provider.longitude is None:
        return {
            "message": "Provider location not available yet",
            "data": {
                "provider_name": provider.name,
                "latitude": None,
                "longitude": None,
            },
        }

    return {
        "data": {
            "provider_name": provider.name,
            "latitude": provider.latitude,
            "longitude": provider.longitude,
        }
    }


@app.get("/profile/{user_id}")
def get_profile(user_id: int, db: Session = Depends(get_db)):
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


@app.put("/profile/{user_id}")
def update_profile(user_id: int, req: ProfileUpdateRequest, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.id == user_id).first()

    if not user:
        return {"error": "User not found"}

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

    return {
        "message": "Profile updated successfully",
        "data": {
            "id": profile.id,
            "user_id": profile.user_id,
            "blood_group": profile.blood_group,
            "emergency_contact_phone": profile.emergency_contact_phone,
            "medical_notes": profile.medical_notes,
            "address": profile.address,
        },
    }


@app.post("/update-location")
def update_location(req: LocationUpdateRequest, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.id == req.user_id).first()

    if not user:
        return {"error": "User not found"}

    user.latitude = req.latitude
    user.longitude = req.longitude
    db.commit()
    db.refresh(user)

    return {
        "message": "Location updated successfully",
        "data": {
            "id": user.id,
            "name": user.name,
            "latitude": user.latitude,
            "longitude": user.longitude,
        },
    }


@app.get("/all-locations")
def get_all_locations(db: Session = Depends(get_db)):
    emergencies = (
        db.query(EmergencyModel)
        .filter(
            EmergencyModel.latitude.isnot(None),
            EmergencyModel.longitude.isnot(None),
        )
        .order_by(EmergencyModel.created_at.desc(), EmergencyModel.id.desc())
        .all()
    )

    return [
        {
            "id": e.id,
            "name": f"{e.type} - {e.status}",
            "latitude": e.latitude,
            "longitude": e.longitude,
            "description": e.description,
            "location_text": e.location_text,
            "accepted_by": e.accepted_by,
            "priority": e.priority,
            "ai_summary": e.ai_summary,
            "created_at": e.created_at,
        }
        for e in emergencies
    ]


@app.get("/debug-priority")
def debug_priority():
    return {
        "message": "priority route live",
        "allowed_priorities": ["low", "medium", "high", "critical"],
    }


@app.get("/debug-priority-value/{emergency_id}")
def debug_priority_value(emergency_id: int, db: Session = Depends(get_db)):
    emergency = db.query(EmergencyModel).filter(EmergencyModel.id == emergency_id).first()

    if not emergency:
        return {"error": "Emergency not found"}

    return {
        "id": emergency.id,
        "type": emergency.type,
        "priority": emergency.priority,
        "ai_summary": emergency.ai_summary,
        "created_at": emergency.created_at,
    }