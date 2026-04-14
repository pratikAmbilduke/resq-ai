from sqlalchemy import create_engine, Column, Integer, String, Float
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/resq_ai"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


class EmergencyModel(Base):
    __tablename__ = "emergencies"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String)
    description = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    location_text = Column(String)
    status = Column(String, default="pending")


class ProfileModel(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    phone = Column(String)
    emergency_contact_name = Column(String)
    emergency_contact_phone = Column(String)


Base.metadata.create_all(bind=engine)