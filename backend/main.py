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

# ---------------- PASSWORD ----------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    print("✅ Backend Started (NEW VERSION)")


def get_db():
    return SessionLocal()


# 🔥 FIXED PASSWORD (NO 72 BYTE ERROR)
def hash_password(password: str):
    sha = hashlib.sha256(password.encode()).hexdigest()
    return pwd_context.hash(sha)


def verify_password(plain: str, hashed: str):
    try:
        sha = hashlib.sha256(plain.encode()).hexdigest()
        return pwd_context.verify(sha, hashed)
    except:
        return False


# ---------------- MODELS ----------------
class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


# ---------------- ROUTES ----------------
@app.get("/")
def root():
    return {"message": "NEW BACKEND RUNNING 🚀"}  # 🔥 change to confirm deployment


@app.get("/health")
def health():
    return {"status": "ok"}


# ---------------- REGISTER ----------------
@app.post("/register")
def register(req: RegisterRequest):
    db: Session = get_db()
    try:
        email = req.email.strip().lower()

        existing = db.query(UserModel).filter(UserModel.email == email).first()
        if existing:
            return {"error": "Email already exists"}

        user = UserModel(
            name=req.name.strip(),
            email=email,
            password=hash_password(req.password),
            role="user"
        )

        db.add(user)
        db.commit()
        db.refresh(user)

        return {"message": "Registered successfully"}

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