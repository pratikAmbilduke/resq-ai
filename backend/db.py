from sqlalchemy import create_engine, Column, Integer, String, Float
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/resq_ai"

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(bind=engine)

Base = declarative_base()

# Emergency Table
class EmergencyModel(Base):
    __tablename__ = "emergencies"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String)
    description = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)

# Create table
Base.metadata.create_all(bind=engine)