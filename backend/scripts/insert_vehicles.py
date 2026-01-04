import requests
from backend.models import db, Vehicle
from backend.extensions import create_app

# Crear la aplicación Flask
app = create_app()

# API de vehículos
NHTSA_BASE_URL = "https://vpic.nhtsa.dot.gov/api/vehicles"

# Vehículos a buscar
vehicle_targets = [
    {"make": "Chery", "model": "Tiggo 2 GLX"},
    {"make": "Chevrolet", "model": "Groove"},
    {"make": "Suzuki", "model": "Baleno"},
    {"make": "Chevrolet", "model": "Spark"},
    {"make": "KIA", "model": "Morning"},
    {"make": "MG", "model": "ZS"},
]

def fetch_vehicle_data(make, model):
    response = requests.get(f"{NHTSA_BASE_URL}/GetModelsForMake/{make}")
    if response.status_code == 200:
        models = response.json().get("Results", [])
        for vehicle in models:
            if model.lower() in vehicle["Model_Name"].lower():
                return {"make": make, "model": vehicle["Model_Name"], "year": 2022}  # Año por defecto
    return None

with app.app_context():
    for target in vehicle_targets:
        vehicle_data = fetch_vehicle_data(target["make"], target["model"])
        if vehicle_data:
            vehicle = Vehicle(**vehicle_data)
            db.session.add(vehicle)

    db.session.commit()
    print("Vehículos insertados correctamente en la base de datos.")