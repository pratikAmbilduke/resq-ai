from fastapi import FastAPI
from pydantic import BaseModel
from db import SessionLocal, EmergencyModel, ProfileModel

app = FastAPI()


# -----------------------------
# Pydantic Models
# -----------------------------
class Emergency(BaseModel):
    type: str
    description: str
    latitude: float
    longitude: float
    location_text: str


class EmergencyUpdate(BaseModel):
    type: str
    description: str
    latitude: float
    longitude: float
    location_text: str
    status: str


class Profile(BaseModel):
    name: str
    phone: str
    emergency_contact_name: str
    emergency_contact_phone: str


# -----------------------------
# Home API
# -----------------------------
@app.get("/")
def home():
    return {"message": "ResQ AI backend is running"}


# -----------------------------
# Emergency APIs
# -----------------------------
@app.post("/emergency")
def create_emergency(emergency: Emergency):
    db = SessionLocal()

    new_emergency = EmergencyModel(
        type=emergency.type,
        description=emergency.description,
        latitude=emergency.latitude,
        longitude=emergency.longitude,
        location_text=emergency.location_text,
        status="pending"
    )

    db.add(new_emergency)
    db.commit()
    db.refresh(new_emergency)

    response_data = {
        "id": new_emergency.id,
        "type": new_emergency.type,
        "description": new_emergency.description,
        "latitude": new_emergency.latitude,
        "longitude": new_emergency.longitude,
        "location_text": new_emergency.location_text,
        "status": new_emergency.status
    }

    db.close()

    return {
        "status": "Saved in DB",
        "data": response_data
    }


@app.get("/emergencies")
def get_emergencies():
    db = SessionLocal()
    emergencies = db.query(EmergencyModel).all()

    response_data = []
    for emergency in emergencies:
        response_data.append({
            "id": emergency.id,
            "type": emergency.type,
            "description": emergency.description,
            "latitude": emergency.latitude,
            "longitude": emergency.longitude,
            "location_text": emergency.location_text,
            "status": emergency.status
        })

    db.close()
    return response_data


@app.get("/emergency/{id}")
def get_emergency_by_id(id: int):
    db = SessionLocal()
    emergency = db.query(EmergencyModel).filter(EmergencyModel.id == id).first()

    if not emergency:
        db.close()
        return {"error": "Emergency not found"}

    response_data = {
        "id": emergency.id,
        "type": emergency.type,
        "description": emergency.description,
        "latitude": emergency.latitude,
        "longitude": emergency.longitude,
        "location_text": emergency.location_text,
        "status": emergency.status
    }

    db.close()
    return response_data


@app.put("/emergency/{id}")
def update_emergency(id: int, updated_data: EmergencyUpdate):
    db = SessionLocal()
    emergency = db.query(EmergencyModel).filter(EmergencyModel.id == id).first()

    if not emergency:
        db.close()
        return {"error": "Emergency not found"}

    emergency.type = updated_data.type
    emergency.description = updated_data.description
    emergency.latitude = updated_data.latitude
    emergency.longitude = updated_data.longitude
    emergency.location_text = updated_data.location_text
    emergency.status = updated_data.status

    db.commit()
    db.refresh(emergency)

    response_data = {
        "id": emergency.id,
        "type": emergency.type,
        "description": emergency.description,
        "latitude": emergency.latitude,
        "longitude": emergency.longitude,
        "location_text": emergency.location_text,
        "status": emergency.status
    }

    db.close()

    return {
        "status": "Emergency updated successfully",
        "data": response_data
    }


@app.delete("/emergency/{id}")
def delete_emergency(id: int):
    db = SessionLocal()
    emergency = db.query(EmergencyModel).filter(EmergencyModel.id == id).first()

    if not emergency:
        db.close()
        return {"error": "Emergency not found"}

    db.delete(emergency)
    db.commit()
    db.close()

    return {"status": f"Emergency with id {id} deleted successfully"}


# -----------------------------
# Profile APIs
# -----------------------------
@app.post("/profile")
def save_profile(profile: Profile):
    db = SessionLocal()

    existing_profile = db.query(ProfileModel).first()

    if existing_profile:
        existing_profile.name = profile.name
        existing_profile.phone = profile.phone
        existing_profile.emergency_contact_name = profile.emergency_contact_name
        existing_profile.emergency_contact_phone = profile.emergency_contact_phone

        db.commit()
        db.refresh(existing_profile)

        response_data = {
            "id": existing_profile.id,
            "name": existing_profile.name,
            "phone": existing_profile.phone,
            "emergency_contact_name": existing_profile.emergency_contact_name,
            "emergency_contact_phone": existing_profile.emergency_contact_phone
        }

        db.close()
        return {
            "message": "Profile updated successfully",
            "data": response_data
        }

    new_profile = ProfileModel(
        name=profile.name,
        phone=profile.phone,
        emergency_contact_name=profile.emergency_contact_name,
        emergency_contact_phone=profile.emergency_contact_phone
    )

    db.add(new_profile)
    db.commit()
    db.refresh(new_profile)

    response_data = {
        "id": new_profile.id,
        "name": new_profile.name,
        "phone": new_profile.phone,
        "emergency_contact_name": new_profile.emergency_contact_name,
        "emergency_contact_phone": new_profile.emergency_contact_phone
    }

    db.close()

    return {
        "message": "Profile saved successfully",
        "data": response_data
    }


@app.get("/profile")
def get_profile():
    db = SessionLocal()
    profile = db.query(ProfileModel).first()

    if not profile:
        db.close()
        return {}

    response_data = {
        "id": profile.id,
        "name": profile.name,
        "phone": profile.phone,
        "emergency_contact_name": profile.emergency_contact_name,
        "emergency_contact_phone": profile.emergency_contact_phone
    }

    db.close()
    return response_data