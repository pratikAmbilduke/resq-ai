from datetime import datetime
import hashlib
from typing import Optional

from fastapi import FastAPI
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
    print("✅ BACKEND LIVE WITH AI")


def get_db():
    return SessionLocal()


def hash_password(password: str):
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(plain: str, hashed: str):
    return hashlib.sha256(plain.encode()).hexdigest() == hashed


# ===========================
# REQUEST MODELS
# ===========================

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


# ===========================
# BASIC ROUTES
# ===========================

@app.get("/")
def root():
    return {"message": "RESQ AI BACKEND LIVE ✅"}


@app.get("/health")
def health():
    return {"status": "ok"}


# ===========================
# AUTH
# ===========================

@app.post("/register")
def register(req: RegisterRequest):
    db: Session = get_db()
    try:
        email = req.email.strip().lower()

        if db.query(UserModel).filter(UserModel.email == email).first():
            return {"error": "Email already exists"}

        role = "admin" if email == "admin@resqai.com" else "user"

        user = UserModel(
            name=req.name.strip(),
            email=email,
            password=hash_password(req.password),
            role=role
        )

        db.add(user)
        db.commit()
        db.refresh(user)

        return {"data": user.id}

    finally:
        db.close()


@app.post("/login")
def login(req: LoginRequest):
    db: Session = get_db()
    try:
        user = db.query(UserModel).filter(UserModel.email == req.email.lower()).first()

        if not user or not verify_password(req.password, user.password):
            return {"error": "Invalid credentials"}

        return {
            "data": {
                "id": user.id,
                "name": user.name,
                "role": user.role
            }
        }

    finally:
        db.close()


# ===========================
# 🚨 EMERGENCY WITH AI
# ===========================

@app.post("/emergency")
def create_emergency(req: EmergencyRequest):
    db: Session = get_db()
    try:
        desc = req.description.lower()

        # 🔥 AI LOGIC
        predicted_type = req.type
        predicted_priority = "medium"

        if "fire" in desc:
            predicted_type = "fire"
            predicted_priority = "high"

        elif "accident" in desc or "crash" in desc or "bike" in desc:
            predicted_type = "accident"
            predicted_priority = "high"

        elif (
            "breathing" in desc
            or "collapsed" in desc
            or "unconscious" in desc
            or "not breathing" in desc
            or "heart" in desc
        ):
            predicted_type = "medical"
            predicted_priority = "critical"

        ai_summary = f"AI detected: {predicted_type} emergency"

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
            created_at=datetime.utcnow()
        )

        db.add(emergency)
        db.commit()
        db.refresh(emergency)

        return {
            "message": "Emergency created",
            "data": {
                "id": emergency.id,
                "type": emergency.type,
                "priority": emergency.priority,
                "ai_summary": ai_summary
            }
        }

    finally:
        db.close()


# ===========================
# USER EMERGENCIES
# ===========================

@app.get("/emergencies/{user_id}")
def get_user_emergencies(user_id: int):
    db: Session = get_db()
    try:
        data = db.query(EmergencyModel)\
            .filter(EmergencyModel.user_id == user_id)\
            .order_by(EmergencyModel.id.desc())\
            .all()

        return [
            {
                "id": e.id,
                "type": e.type,
                "description": e.description,
                "status": e.status,
                "priority": e.priority,
                "created_at": e.created_at
            }
            for e in data
        ]

    finally:
        db.close()


# ===========================
# ADMIN
# ===========================

@app.get("/admin/emergencies/{user_id}")
def admin_data(user_id: int):
    db: Session = get_db()
    try:
        user = db.query(UserModel).filter(UserModel.id == user_id).first()

        if not user or user.role != "admin":
            return {"error": "Access denied"}

        data = db.query(EmergencyModel)\
            .order_by(EmergencyModel.id.desc())\
            .all()

        return [
            {
                "id": e.id,
                "type": e.type,
                "description": e.description,
                "status": e.status,
                "priority": e.priority,
                "location_text": e.location_text
            }
            for e in data
        ]

    finally:
        db.close()


# ===========================
# STATUS UPDATE
# ===========================

@app.put("/emergency/{emergency_id}/status")
def update_status(emergency_id: int, req: StatusUpdateRequest):
    db: Session = get_db()
    try:
        e = db.query(EmergencyModel).filter(EmergencyModel.id == emergency_id).first()

        if not e:
            return {"error": "Not found"}

        e.status = req.status
        db.commit()

        return {"message": "updated"}

    finally:
        db.close()


# ===========================
# LOCATION UPDATE
# ===========================

@app.post("/update-location")
def update_location(req: LocationUpdateRequest):
    db: Session = get_db()
    try:
        user = db.query(UserModel).filter(UserModel.id == req.user_id).first()

        if not user:
            return {"error": "User not found"}

        user.latitude = req.latitude
        user.longitude = req.longitude
        db.commit()

        return {"message": "Location updated"}

    finally:
        db.close()