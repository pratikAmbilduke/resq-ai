from fastapi import FastAPI
from pydantic import BaseModel
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
import hashlib
from typing import Optional

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
    print("✅ RENDER BACKEND LIVE")


def get_db():
    return SessionLocal()


def hash_password(password: str):
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(plain: str, hashed: str):
    return hashlib.sha256(plain.encode()).hexdigest() == hashed


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


@app.get("/")
def root():
    return {"message": "RENDER BACKEND LIVE ✅"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/debug-priority")
def debug_priority():
    return {
        "message": "priority route live",
        "allowed_priorities": ["low", "medium", "high", "critical"]
    }


@app.get("/debug-priority-value/{emergency_id}")
def debug_priority_value(emergency_id: int):
    db: Session = get_db()
    try:
        emergency = db.query(EmergencyModel).filter(EmergencyModel.id == emergency_id).first()

        if not emergency:
            return {"error": "Emergency not found"}

        return {
            "id": emergency.id,
            "type": emergency.type,
            "priority": emergency.priority
        }
    except Exception as e:
        print("Debug Priority Value Error:", e)
        return {"error": str(e)}
    finally:
        db.close()


@app.post("/register")
def register(req: RegisterRequest):
    db: Session = get_db()
    try:
        email = req.email.strip().lower()

        existing = db.query(UserModel).filter(UserModel.email == email).first()
        if existing:
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

        return {
            "message": "Registered successfully",
            "data": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role
            }
        }

    except Exception as e:
        print("Register Error:", e)
        return {"error": str(e)}
    finally:
        db.close()


@app.post("/login")
def login(req: LoginRequest):
    db: Session = get_db()
    try:
        email = req.email.strip().lower()

        user = db.query(UserModel).filter(UserModel.email == email).first()

        if not user:
            return {"error": "Email not found"}

        if not verify_password(req.password, user.password):
            return {"error": "Wrong password"}

        return {
            "message": "Login success",
            "data": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role
            }
        }

    except Exception as e:
        print("Login Error:", e)
        return {"error": str(e)}
    finally:
        db.close()


@app.post("/emergency")
def create_emergency(req: EmergencyRequest):
    db: Session = get_db()
    try:
        emergency = EmergencyModel(
            type=req.type,
            description=req.description,
            latitude=req.latitude,
            longitude=req.longitude,
            location_text=req.location_text,
            user_id=req.user_id,
            status="pending",
            accepted_by=None,
            priority="medium"
        )

        db.add(emergency)
        db.commit()
        db.refresh(emergency)

        return {
            "message": "Emergency created successfully",
            "data": {
                "id": emergency.id,
                "type": emergency.type,
                "description": emergency.description,
                "latitude": emergency.latitude,
                "longitude": emergency.longitude,
                "location_text": emergency.location_text,
                "status": emergency.status,
                "priority": emergency.priority,
                "user_id": emergency.user_id,
                "accepted_by": emergency.accepted_by
            }
        }

    except Exception as e:
        print("Emergency Create Error:", e)
        return {"error": str(e)}
    finally:
        db.close()


@app.get("/emergencies/{user_id}")
def get_user_emergencies(user_id: int):
    db: Session = get_db()
    try:
        emergencies = (
            db.query(EmergencyModel)
            .filter(EmergencyModel.user_id == user_id)
            .order_by(EmergencyModel.id.desc())
            .all()
        )

        return [
            {
                "id": e.id,
                "type": e.type,
                "description": e.description,
                "latitude": e.latitude,
                "longitude": e.longitude,
                "location_text": e.location_text,
                "status": e.status,
                "priority": e.priority,
                "user_id": e.user_id,
                "accepted_by": e.accepted_by
            }
            for e in emergencies
        ]

    except Exception as e:
        print("Get Emergencies Error:", e)
        return {"error": str(e)}
    finally:
        db.close()


@app.get("/admin/emergencies/{user_id}")
def get_all_emergencies(user_id: int):
    db: Session = get_db()
    try:
        user = db.query(UserModel).filter(UserModel.id == user_id).first()

        if not user or user.role != "admin":
            return {"error": "Access denied"}

        emergencies = db.query(EmergencyModel).order_by(EmergencyModel.id.desc()).all()

        return [
            {
                "id": e.id,
                "type": e.type,
                "description": e.description,
                "latitude": e.latitude,
                "longitude": e.longitude,
                "location_text": e.location_text,
                "status": e.status,
                "priority": e.priority,
                "user_id": e.user_id,
                "accepted_by": e.accepted_by
            }
            for e in emergencies
        ]

    except Exception as e:
        print("Admin Error:", e)
        return {"error": str(e)}
    finally:
        db.close()


@app.put("/emergency/{emergency_id}/status")
def update_status(emergency_id: int, req: StatusUpdateRequest):
    db: Session = get_db()
    try:
        emergency = db.query(EmergencyModel).filter(EmergencyModel.id == emergency_id).first()

        if not emergency:
            return {"error": "Emergency not found"}

        allowed_statuses = ["pending", "accepted", "in progress", "resolved", "cancelled"]
        new_status = req.status.strip().lower()

        if new_status not in allowed_statuses:
            return {"error": "Invalid status"}

        if new_status == "cancelled" and str(emergency.status).lower() != "pending":
            return {"error": "Only pending requests can be cancelled"}

        emergency.status = new_status

        if new_status == "accepted":
            if req.accepted_by:
                emergency.accepted_by = req.accepted_by.strip()
        elif new_status in ["pending", "cancelled"]:
            emergency.accepted_by = None

        db.commit()
        db.refresh(emergency)

        return {
            "message": "Status updated",
            "data": {
                "id": emergency.id,
                "status": emergency.status,
                "priority": emergency.priority,
                "accepted_by": emergency.accepted_by
            }
        }

    except Exception as e:
        print("Status Update Error:", e)
        return {"error": str(e)}
    finally:
        db.close()


@app.put("/admin/emergency/{emergency_id}/priority/{admin_user_id}")
def update_priority(emergency_id: int, admin_user_id: int, req: PriorityUpdateRequest):
    db: Session = get_db()
    try:
        admin_user = db.query(UserModel).filter(UserModel.id == admin_user_id).first()

        if not admin_user or admin_user.role != "admin":
            return {"error": "Access denied"}

        emergency = db.query(EmergencyModel).filter(EmergencyModel.id == emergency_id).first()

        if not emergency:
            return {"error": "Emergency not found"}

        new_priority = req.priority.strip().lower()
        allowed_priorities = ["low", "medium", "high", "critical"]

        if new_priority not in allowed_priorities:
            return {"error": "Invalid priority"}

        emergency.priority = new_priority
        db.commit()
        db.refresh(emergency)

        return {
            "message": "Priority updated successfully",
            "data": {
                "id": emergency.id,
                "priority": emergency.priority
            }
        }

    except Exception as e:
        print("Priority Update Error:", e)
        return {"error": str(e)}
    finally:
        db.close()


@app.delete("/admin/emergency/{emergency_id}/{admin_user_id}")
def delete_emergency(emergency_id: int, admin_user_id: int):
    db: Session = get_db()
    try:
        admin_user = db.query(UserModel).filter(UserModel.id == admin_user_id).first()

        if not admin_user or admin_user.role != "admin":
            return {"error": "Access denied"}

        emergency = db.query(EmergencyModel).filter(EmergencyModel.id == emergency_id).first()

        if not emergency:
            return {"error": "Emergency not found"}

        db.delete(emergency)
        db.commit()

        return {"message": "Emergency deleted successfully"}

    except Exception as e:
        print("Delete Emergency Error:", e)
        return {"error": str(e)}
    finally:
        db.close()


@app.get("/provider-location/{emergency_id}")
def get_provider_location(emergency_id: int):
    db: Session = get_db()
    try:
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
                    "longitude": None
                }
            }

        return {
            "data": {
                "provider_name": provider.name,
                "latitude": provider.latitude,
                "longitude": provider.longitude
            }
        }

    except Exception as e:
        print("Provider Location Error:", e)
        return {"error": str(e)}
    finally:
        db.close()


@app.get("/profile/{user_id}")
def get_profile(user_id: int):
    db: Session = get_db()
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
            "address": profile.address
        }

    except Exception as e:
        print("Get Profile Error:", e)
        return {"error": str(e)}
    finally:
        db.close()


@app.put("/profile/{user_id}")
def update_profile(user_id: int, req: ProfileUpdateRequest):
    db: Session = get_db()
    try:
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
                "address": profile.address
            }
        }

    except Exception as e:
        print("Profile Update Error:", e)
        return {"error": str(e)}
    finally:
        db.close()


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
        db.refresh(user)

        return {
            "message": "Location updated successfully",
            "data": {
                "id": user.id,
                "name": user.name,
                "latitude": user.latitude,
                "longitude": user.longitude
            }
        }

    except Exception as e:
        print("Location Update Error:", e)
        return {"error": str(e)}
    finally:
        db.close()


@app.get("/all-locations")
def get_all_locations():
    db: Session = get_db()
    try:
        emergencies = (
            db.query(EmergencyModel)
            .filter(
                EmergencyModel.latitude.isnot(None),
                EmergencyModel.longitude.isnot(None)
            )
            .order_by(EmergencyModel.id.desc())
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
                "priority": e.priority
            }
            for e in emergencies
        ]

    except Exception as e:
        print("All Locations Error:", e)
        return {"error": str(e)}
    finally:
        db.close()