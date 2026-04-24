from datetime import datetime
import os

from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text
from sqlalchemy.orm import declarative_base, sessionmaker

# ================================
# DATABASE CONFIG (SINGLE SOURCE)
# ================================
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./emergency.db")

engine_kwargs = {}
if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False
)

Base = declarative_base()


# ================================
# USER TABLE
# ================================
class UserModel(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)

    email = Column(String, unique=True, nullable=False, index=True)
    password = Column(String, nullable=False)

    role = Column(String, default="user")  # admin / user

    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    # ================================
# EMERGENCY TABLE
# ================================
class EmergencyModel(Base):
    __tablename__ = "emergencies"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, nullable=False, index=True)

    type = Column(String, default="other")
    description = Column(Text, nullable=False)

    location_text = Column(Text, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    severity = Column(Integer, default=0)
    suggested_help = Column(String, nullable=True)

    status = Column(String, default="pending")
    priority = Column(String, default="medium")

    accepted_by = Column(String, nullable=True)

    ai_summary = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


# ================================
# PROFILE TABLE
# ================================
class ProfileModel(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, unique=True, nullable=False, index=True)

    blood_group = Column(String, nullable=True)
    emergency_contact_phone = Column(String, nullable=True)
    medical_notes = Column(Text, nullable=True)
    address = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)