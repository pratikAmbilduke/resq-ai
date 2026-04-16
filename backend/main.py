from fastapi import FastAPI
from pydantic import BaseModel
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from passlib.context import CryptContext
import hashlib

from db import SessionLocal, UserModel, EmergencyModel, ProfileModel, Base, engine

app = FastAPI()

# ---------------- CORS ----------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- PASSWORD CONTEXT ----------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ---------------- STARTUP ----------------
@app.on_event("startup")
def startup():
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Database connected successfully")
    except Exception as e:
        print("❌ DB ERROR:", e)
        raise e


# ---------------- DB SESSION ----------------
def get_db():
    db = SessionLocal()
    return db


# ---------------- PASSWORD FUNCTIONS (FIXED) ----------------
def hash_password(password: str):
    sha256_password = hashlib.sha256(password.encode()).hexdigest()
    return pwd_context.hash(sha256_password)


def verify_password(plain: str, hashed: str):
    try:
        sha256_password = hashlib.sha256(plain.encode()).hexdigest()
        return pwd_context.verify(sha256_password, hashed)
    except Exception:
        return False


# ---------------- MODELS ----------------
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


# ---------------- HEALTH ----------------
@app.get("/")
def root():
    return {"message": "ResQ AI Backend Running 🚀"}


@app.get("/health")
def health():
    return {"status": "ok"}


# ---------------- REGISTER ----------------
@app.post("/register")
def register(req: RegisterRequest):
    db: Session = get_db()
    try:
        clean_email = req.email.strip().lower()
        clean_password = req.password.strip()

        if len(clean_password) < 6:
            return {"error": "Password must be at least 6 characters"}

        existing = db.query(UserModel).filter(UserModel.email == clean_email).first()
        if existing:
            return {"error": "Email already registered"}

        role = "admin" if clean_email == "admin@resqai.com" else "user"

        user = UserModel(
            name=req.name.strip(),
            email=clean_email,
            password=hash_password(clean_password),
            role=role
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        return {
            "message": "User registered successfully",
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


# ---------------- LOGIN ----------------
@app.post("/login")
def login(req: LoginRequest):
    db: Session = get_db()
    try:
        user = db.query(UserModel).filter(
            UserModel.email == req.email.strip().lower()
        ).first()

        if not user:
            return {"error": "Email not found"}

        if not verify_password(req.password, user.password):
            return {"error": "Invalid password"}

        return {
            "message": "Login successful",
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


# ---------------- CREATE EMERGENCY ----------------
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

        return {"message": "Emergency created successfully", "data": emergency.__dict__}

    except Exception as e:
        print("Emergency Create Error:", e)
        return {"error": str(e)}

    finally:
        db.close()


# ---------------- GET USER EMERGENCIES ----------------
@app.get("/emergencies/{user_id}")
def get_user_emergencies(user_id: int):
    db: Session = get_db()
    try:
        emergencies = db.query(EmergencyModel).filter(
            EmergencyModel.user_id == user_id
        ).all()

        return [e.__dict__ for e in emergencies]

    except Exception as e:
        print("Get Emergencies Error:", e)
        return {"error": str(e)}

    finally:
        db.close()


# ---------------- UPDATE STATUS ----------------
@app.put("/emergency/{emergency_id}/status")
def update_status(emergency_id: int, req: StatusUpdateRequest):
    db: Session = get_db()
    try:
        emergency = db.query(EmergencyModel).filter(
            EmergencyModel.id == emergency_id
        ).first()

        if not emergency:
            return {"error": "Emergency not found"}

        emergency.status = req.status
        db.commit()
        db.refresh(emergency)

        return {"message": "Status updated", "data": {"id": emergency.id, "status": emergency.status}}

    except Exception as e:
        print("Status Update Error:", e)
        return {"error": str(e)}

    finally:
        db.close()


# ---------------- ADMIN ----------------
@app.post("/admin/emergencies")
def get_all_emergencies(req: AdminRequest):
    db: Session = get_db()
    try:
        user = db.query(UserModel).filter(UserModel.id == req.user_id).first()

        if not user or user.role != "admin":
            return {"error": "Access denied"}

        emergencies = db.query(EmergencyModel).all()
        return [e.__dict__ for e in emergencies]

    except Exception as e:
        print("Admin Error:", e)
        return {"error": str(e)}

    finally:
        db.close()


# ---------------- PROFILE ----------------
@app.post("/profile")
def save_profile(req: ProfileRequest):
    db: Session = get_db()
    try:
        profile = db.query(ProfileModel).filter(
            ProfileModel.user_id == req.user_id
        ).first()

        if profile:
            profile.name = req.name
            profile.phone = req.phone
            profile.emergency_contact_name = req.emergency_contact_name
            profile.emergency_contact_phone = req.emergency_contact_phone
        else:
            profile = ProfileModel(**req.dict())
            db.add(profile)

        db.commit()
        db.refresh(profile)

        return {"message": "Profile saved", "data": profile.__dict__}

    except Exception as e:
        print("Profile Error:", e)
        return {"error": str(e)}

    finally:
        db.close()


# ---------------- GET PROFILE ----------------
@app.get("/profile/{user_id}")
def get_profile(user_id: int):
    db: Session = get_db()
    try:
        profile = db.query(ProfileModel).filter(
            ProfileModel.user_id == user_id
        ).first()

        return profile.__dict__ if profile else {}

    except Exception as e:
        print("Get Profile Error:", e)
        return {"error": str(e)}

    finally:
        db.close()