from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def home():
    return {"message": "ResQ AI backend is running"}