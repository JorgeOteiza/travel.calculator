from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.extensions import db
from backend.models import Trip, Vehicle
import requests
import os

trip_calc_bp = Blueprint("trip_calc_bp", __name__)

@trip_calc_bp.route("/trips/calculate-and-save", methods=["POST"])
@jwt_required()
def calculate_and_save_trip():
    user_id = get_jwt_identity()
    data = request.get_json()

    required = [
        "brand", "model", "year",
        "origin", "destination",
        "total_weight", "passengers"
    ]

    for field in required:
        if field not in data:
            return jsonify({"error": f"Falta campo {field}"}), 400

    GOOGLE_API_KEY = os.getenv("VITE_GOOGLE_MAPS_API_KEY")
    OPENWEATHERMAP_API_KEY = os.getenv("VITE_OPENWEATHERMAP_API_KEY")

    origin = f"{data['origin']['lat']},{data['origin']['lng']}"
    destination = f"{data['destination']['lat']},{data['destination']['lng']}"

    # 📏 DISTANCIA
    dist_url = (
        "https://maps.googleapis.com/maps/api/distancematrix/json"
        f"?units=metric&origins={origin}&destinations={destination}&key={GOOGLE_API_KEY}"
    )
    dist_res = requests.get(dist_url).json()
    distance_km = dist_res["rows"][0]["elements"][0]["distance"]["value"] / 1000

    # 🏔️ ELEVACIÓN
    elev_url = (
        "https://maps.googleapis.com/maps/api/elevation/json"
        f"?locations={origin}|{destination}&key={GOOGLE_API_KEY}"
    )
    elev_res = requests.get(elev_url).json()

    elev_origin = elev_res["results"][0]["elevation"]
    elev_dest = elev_res["results"][1]["elevation"]

    road_grade = round(
        ((elev_dest - elev_origin) / (distance_km * 1000)) * 100, 2
    )

    # 🌦️ CLIMA
    weather_url = (
        f"https://api.openweathermap.org/data/2.5/weather"
        f"?lat={data['origin']['lat']}&lon={data['origin']['lng']}"
        f"&appid={OPENWEATHERMAP_API_KEY}&units=metric"
    )
    weather = requests.get(weather_url).json()

    temp = weather["main"]["temp"]
    wind = weather["wind"]["speed"]

    if temp <= 5:
        climate = "cold"
    elif temp >= 30:
        climate = "hot"
    elif wind >= 8:
        climate = "windy"
    else:
        climate = "mild"

    # 🚘 VEHÍCULO
    vehicle = Vehicle.query.filter_by(
        make=data["brand"],
        model=data["model"],
        year=data["year"]
    ).first()

    if not vehicle:
        return jsonify({"error": "Vehículo no encontrado"}), 404

    # 🧮 CÁLCULO
    base_fc = vehicle.lkm_mixed
    weight_factor = data["total_weight"] / vehicle.weight_kg
    slope_factor = 1 + abs(road_grade) / 100
    climate_factor = {
        "cold": 1.05,
        "hot": 1.07,
        "windy": 1.04,
        "mild": 1.0
    }[climate]

    adjusted_fc = base_fc * weight_factor * slope_factor * climate_factor
    fuel_used = round((distance_km / 100) * adjusted_fc, 2)
    total_cost = round(fuel_used * data.get("fuel_price", 0), 2)

    # 💾 GUARDAR
    trip = Trip(
        user_id=user_id,
        brand=data["brand"],
        model=data["model"],
        year=data["year"],
        fuel_type=vehicle.fuel_type,
        fuel_price=data.get("fuel_price"),
        total_weight=data["total_weight"],
        passengers=data["passengers"],
        location="Ruta calculada",
        distance=round(distance_km, 2),
        fuel_consumed=fuel_used,
        total_cost=total_cost,
        road_grade=road_grade,
        weather=climate
    )

    db.session.add(trip)
    db.session.commit()

    return jsonify({
        "distance": distance_km,
        "fuelUsed": fuel_used,
        "totalCost": total_cost,
        "roadGrade": road_grade,
        "climate": climate,
        "baseFC": base_fc,
        "adjustedFC": adjusted_fc
    }), 201
