from sqlalchemy import create_engine, Column, Integer, String, Float
from sqlalchemy.orm import declarative_base, sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

Base = declarative_base()


class UserModel(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, default="user")
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)


class EmergencyModel(Base):
    __tablename__ = "emergencies"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, nullable=False)
    description = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    location_text = Column(String, nullable=False)
    status = Column(String, default="pending")
    user_id = Column(Integer, nullable=False)
    accepted_by = Column(String, nullable=True)
    priority = Column(String, default="medium")


class ProfileModel(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, unique=True)

    blood_group = Column(String, nullable=True)
    emergency_contact_phone = Column(String, nullable=True)
    medical_notes = Column(String, nullable=True)
    address = Column(String, nullable=True)