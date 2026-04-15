from fastapi import FastAPI
from pydantic import BaseModel
from passlib.context import CryptContext
from db import SessionLocal, EmergencyModel, ProfileModel, UserModel

app = FastAPI()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class UserRegister(BaseModel):
    name: str
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class Emergency(BaseModel):
    type: str
    description: str
    latitude: float
    longitude: float
    location_text: str
    user_id: int


class EmergencyStatusUpdate(BaseModel):
    status: str


class Profile(BaseModel):
    name: str
    phone: str
    emergency_contact_name: str
    emergency_contact_phone: str
    user_id: int


class AdminAccessRequest(BaseModel):
    user_id: int


def hash_password(password: str):
    return pwd_context.hash(password[:50])


def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password[:50], hashed_password)


@app.get("/")
def home():
    return {"message": "Backend running"}


@app.post("/register")
def register(user: UserRegister):
    db = SessionLocal()

    try:
        existing = db.query(UserModel).filter(UserModel.email == user.email).first()
        if existing:
            return {"error": "Email already exists"}

        hashed = hash_password(user.password)
        role = "admin" if user.email.lower() == "admin@resqai.com" else "user"

        new_user = UserModel(
            name=user.name,
            email=user.email,
            password=hashed,
            role=role
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        return {
            "message": "Registered successfully",
            "data": {
                "id": new_user.id,
                "name": new_user.name,
                "email": new_user.email,
                "role": new_user.role
            }
        }

    except Exception as e:
        print("Register Error:", e)
        return {"error": str(e)}

    finally:
        db.close()


@app.post("/login")
def login(user: UserLogin):
    db = SessionLocal()

    try:
        existing = db.query(UserModel).filter(UserModel.email == user.email).first()

        if not existing:
            return {"error": "Invalid credentials"}

        if not verify_password(user.password, existing.password):
            return {"error": "Invalid credentials"}

        return {
            "message": "Login success",
            "data": {
                "id": existing.id,
                "name": existing.name,
                "email": existing.email,
                "role": existing.role
            }
        }

    except Exception as e:
        print("Login Error:", e)
        return {"error": str(e)}

    finally:
        db.close()


@app.post("/emergency")
def create_emergency(e: Emergency):
    db = SessionLocal()

    try:
        new = EmergencyModel(
            type=e.type,
            description=e.description,
            latitude=e.latitude,
            longitude=e.longitude,
            location_text=e.location_text,
            status="pending",
            user_id=e.user_id
        )

        db.add(new)
        db.commit()
        db.refresh(new)

        return {
            "message": "Emergency saved",
            "data": {
                "id": new.id,
                "type": new.type,
                "description": new.description,
                "latitude": new.latitude,
                "longitude": new.longitude,
                "location_text": new.location_text,
                "status": new.status,
                "user_id": new.user_id
            }
        }

    except Exception as e:
        print("Emergency Error:", e)
        return {"error": str(e)}

    finally:
        db.close()


@app.get("/emergencies/{user_id}")
def get_emergencies_by_user(user_id: int):
    db = SessionLocal()

    try:
        data = db.query(EmergencyModel).filter(EmergencyModel.user_id == user_id).all()

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
            for e in data
        ]

    except Exception as e:
        print("Fetch Emergencies Error:", e)
        return {"error": str(e)}

    finally:
        db.close()


@app.post("/admin/emergencies")
def get_all_emergencies(payload: AdminAccessRequest):
    db = SessionLocal()

    try:
        admin_user = db.query(UserModel).filter(UserModel.id == payload.user_id).first()

        if not admin_user:
            return {"error": "User not found"}

        if admin_user.role != "admin":
            return {"error": "Access denied. Admin only."}

        data = db.query(EmergencyModel).order_by(EmergencyModel.id.desc()).all()

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
            for e in data
        ]

    except Exception as e:
        print("Admin Fetch Error:", e)
        return {"error": str(e)}

    finally:
        db.close()


@app.put("/emergency/{emergency_id}/status")
def update_emergency_status(emergency_id: int, payload: EmergencyStatusUpdate):
    db = SessionLocal()

    try:
        emergency = db.query(EmergencyModel).filter(EmergencyModel.id == emergency_id).first()

        if not emergency:
            return {"error": "Emergency not found"}

        allowed_statuses = ["pending", "in_progress", "resolved"]

        if payload.status not in allowed_statuses:
            return {"error": "Invalid status value"}

        emergency.status = payload.status
        db.commit()
        db.refresh(emergency)

        return {
            "message": "Emergency status updated successfully",
            "data": {
                "id": emergency.id,
                "status": emergency.status
            }
        }

    except Exception as e:
        print("Update Status Error:", e)
        return {"error": str(e)}

    finally:
        db.close()


@app.post("/profile")
def save_profile(p: Profile):
    db = SessionLocal()

    try:
        existing = db.query(ProfileModel).filter(ProfileModel.user_id == p.user_id).first()

        if existing:
            existing.name = p.name
            existing.phone = p.phone
            existing.emergency_contact_name = p.emergency_contact_name
            existing.emergency_contact_phone = p.emergency_contact_phone
            db.commit()
            db.refresh(existing)

            return {
                "message": "Profile updated",
                "data": {
                    "id": existing.id,
                    "name": existing.name,
                    "phone": existing.phone,
                    "emergency_contact_name": existing.emergency_contact_name,
                    "emergency_contact_phone": existing.emergency_contact_phone,
                    "user_id": existing.user_id
                }
            }

        profile = ProfileModel(
            name=p.name,
            phone=p.phone,
            emergency_contact_name=p.emergency_contact_name,
            emergency_contact_phone=p.emergency_contact_phone,
            user_id=p.user_id
        )

        db.add(profile)
        db.commit()
        db.refresh(profile)

        return {
            "message": "Profile saved",
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
        print("Profile Save Error:", e)
        return {"error": str(e)}

    finally:
        db.close()


@app.get("/profile/{user_id}")
def get_profile(user_id: int):
    db = SessionLocal()

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
        print("Profile Fetch Error:", e)
        return {"error": str(e)}

    finally:
        db.close()