from fastapi import FastAPI
from pydantic import BaseModel
from db import SessionLocal, EmergencyModel

app = FastAPI()

# Request Model
class Emergency(BaseModel):
    type: str
    description: str
    latitude: float
    longitude: float

@app.get("/")
def home():
    return {"message": "ResQ AI backend is running"}

@app.post("/emergency")
def create_emergency(emergency: Emergency):
    db = SessionLocal()

    new_emergency = EmergencyModel(
        type=emergency.type,
        description=emergency.description,
        latitude=emergency.latitude,
        longitude=emergency.longitude
    )

    db.add(new_emergency)
    db.commit()
    db.refresh(new_emergency)

    db.close()

    return {"status": "Saved in DB"}

from fastapi import FastAPI
from pydantic import BaseModel
from db import SessionLocal, EmergencyModel

app = FastAPI()

class Emergency(BaseModel):
    type: str
    description: str
    latitude: float
    longitude: float

@app.get("/")
def home():
    return {"message": "ResQ AI backend is running"}

@app.post("/emergency")
def create_emergency(emergency: Emergency):
    db = SessionLocal()

    new_emergency = EmergencyModel(
        type=emergency.type,
        description=emergency.description,
        latitude=emergency.latitude,
        longitude=emergency.longitude
    )

    db.add(new_emergency)
    db.commit()
    db.refresh(new_emergency)
    db.close()

    return {"status": "Saved in DB"}

@app.get("/emergencies")
def get_emergencies():
    db = SessionLocal()
    emergencies = db.query(EmergencyModel).all()
    db.close()

    return emergencies