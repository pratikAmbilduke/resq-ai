from fastapi import FastAPI
from pydantic import BaseModel
from passlib.context import CryptContext
from db import SessionLocal, EmergencyModel, ProfileModel, UserModel

app = FastAPI()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ---------------- MODELS ----------------
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

class Profile(BaseModel):
    name: str
    phone: str
    emergency_contact_name: str
    emergency_contact_phone: str


# ---------------- PASSWORD FUNCTIONS ----------------
def hash_password(password: str):
    # SAFE FIX FOR BCRYPT LIMIT
    return pwd_context.hash(password[:50])

def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password[:50], hashed_password)


# ---------------- HOME ----------------
@app.get("/")
def home():
    return {"message": "Backend running"}


# ---------------- REGISTER ----------------
@app.post("/register")
def register(user: UserRegister):
    db = SessionLocal()

    try:
        existing = db.query(UserModel).filter(UserModel.email == user.email).first()
        if existing:
            return {"error": "Email already exists"}

        hashed = hash_password(user.password)

        new_user = UserModel(
            name=user.name,
            email=user.email,
            password=hashed
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        return {
            "message": "Registered successfully",
            "data": {
                "id": new_user.id,
                "email": new_user.email
            }
        }

    except Exception as e:
        print("Register Error:", e)
        return {"error": str(e)}

    finally:
        db.close()


# ---------------- LOGIN ----------------
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
                "email": existing.email
            }
        }

    except Exception as e:
        print("Login Error:", e)
        return {"error": str(e)}

    finally:
        db.close()


# ---------------- EMERGENCY ----------------
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
            status="pending"
        )

        db.add(new)
        db.commit()

        return {"message": "Emergency saved"}

    except Exception as e:
        print(e)
        return {"error": str(e)}

    finally:
        db.close()


@app.get("/emergencies")
def get_emergencies():
    db = SessionLocal()

    try:
        data = db.query(EmergencyModel).all()
        return data

    except Exception as e:
        return {"error": str(e)}

    finally:
        db.close()


# ---------------- PROFILE ----------------
@app.post("/profile")
def save_profile(p: Profile):
    db = SessionLocal()

    try:
        profile = ProfileModel(
            name=p.name,
            phone=p.phone,
            emergency_contact_name=p.emergency_contact_name,
            emergency_contact_phone=p.emergency_contact_phone
        )

        db.add(profile)
        db.commit()

        return {"message": "Profile saved"}

    except Exception as e:
        return {"error": str(e)}

    finally:
        db.close()


@app.get("/profile")
def get_profile():
    db = SessionLocal()

    try:
        return db.query(ProfileModel).all()

    except Exception as e:
        return {"error": str(e)}

    finally:
        db.close()