from fastapi import FastAPI
from pydantic import BaseModel
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
import hashlib

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


class AdminRequest(BaseModel):
    user_id: int


class ProfileRequest(BaseModel):
    name: str
    phone: str
    emergency_contact_name: str
    emergency_contact_phone: str
    user_id: int


@app.get("/")
def root():
    return {"message": "RENDER BACKEND LIVE ✅"}


@app.get("/health")
def health():
    return {"status": "ok"}


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
            status="pending"
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
                "user_id": emergency.user_id
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
                "user_id": e.user_id
            }
            for e in emergencies
        ]

    except Exception as e:
        print("Get Emergencies Error:", e)
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

        emergency.status = req.status
        db.commit()
        db.refresh(emergency)

        return {
            "message": "Status updated",
            "data": {
                "id": emergency.id,
                "status": emergency.status
            }
        }

    except Exception as e:
        print("Status Update Error:", e)
        return {"error": str(e)}

    finally:
        db.close()


@app.post("/admin/emergencies")
def get_all_emergencies(req: AdminRequest):
    db: Session = get_db()
    try:
        user = db.query(UserModel).filter(UserModel.id == req.user_id).first()

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
                "user_id": e.user_id
            }
            for e in emergencies
        ]

    except Exception as e:
        print("Admin Error:", e)
        return {"error": str(e)}

    finally:
        db.close()


@app.post("/profile")
def save_profile(req: ProfileRequest):
    db: Session = get_db()
    try:
        profile = db.query(ProfileModel).filter(ProfileModel.user_id == req.user_id).first()

        if profile:
            profile.name = req.name
            profile.phone = req.phone
            profile.emergency_contact_name = req.emergency_contact_name
            profile.emergency_contact_phone = req.emergency_contact_phone
        else:
            profile = ProfileModel(
                name=req.name,
                phone=req.phone,
                emergency_contact_name=req.emergency_contact_name,
                emergency_contact_phone=req.emergency_contact_phone,
                user_id=req.user_id
            )
            db.add(profile)

        db.commit()
        db.refresh(profile)

        return {
            "message": "Profile saved successfully",
            "data": {
                "id": profile.id,
                "name": profile.name,
                "phone": profile.phone,
                "emergency_contact_name": profile.emergency_contact_name,
                "emergency_contact_phone": profile.emergency_contact_phone,
                "user_id": profile.user_id
            }
        }

    except Exception as e:
        print("Profile Error:", e)
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
            "name": profile.name,
            "phone": profile.phone,
            "emergency_contact_name": profile.emergency_contact_name,
            "emergency_contact_phone": profile.emergency_contact_phone,
            "user_id": profile.user_id
        }

    except Exception as e:
        print("Get Profile Error:", e)
        return {"error": str(e)}

    finally:
        db.close()