from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_cors import cross_origin
from sqlalchemy.exc import SQLAlchemyError

from backend.models import db, Trip, Vehicle, UserVehicle
from backend.services.distance_service import get_distance_km
from backend.services.weather_service import get_weather_from_coords
from backend.services.consumption_service import calculate_trip_consumption
from backend.services.route_elevation_service import get_route_elevation_segments
from backend.utils.trip_calculation import calculate_trip_from_segments

from backend.services.polyline_service import decode_polyline, reduce_points
from backend.services.elevation_profile import get_elevation_for_points
from backend.services.elevation_profile_chart_service import build_elevation_profile

import traceback

trip_calc_and_save_bp = Blueprint("trip_calc_and_save_bp", __name__)

PASSENGER_WEIGHT = 75
MAX_PASSENGERS = 8
MAX_FUEL_PRICE = 5000


@trip_calc_and_save_bp.route("/trips/calculate-and-save", methods=["POST"])
@cross_origin()
@jwt_required()
def calculate_and_save_trip():
    try:
        user_id = get_jwt_identity()
        data = request.get_json() or {}

        print("📥 DATA:", data)

        # ===============================
        # 🔎 Validación
        # ===============================
        required_fields = [
            "brand", "model", "year",
            "origin", "destination",
            "passengers", "route_polyline"
        ]

        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Falta el campo '{field}'"}), 400

        brand = data["brand"].lower().strip()
        model = data["model"].lower().strip()
        year = int(data["year"])
        passengers = int(data["passengers"])

        if passengers < 0 or passengers > MAX_PASSENGERS:
            return jsonify({"error": "Pasajeros inválidos"}), 400

        extra_weight = float(data.get("extra_weight", 0))
        fuel_price = float(data.get("fuel_price", 0))

        if fuel_price < 0 or fuel_price > MAX_FUEL_PRICE:
            return jsonify({"error": "Precio de combustible inválido"}), 400

        origin = data["origin"]
        destination = data["destination"]
        polyline = data["route_polyline"]

        # ===============================
        # 🚗 Vehículo
        # ===============================
        vehicle = Vehicle.query.filter(
            db.func.lower(Vehicle.make) == brand,
            db.func.lower(Vehicle.model) == model,
            Vehicle.year == year,
        ).first()

        if not vehicle:
            return jsonify({"error": "Vehículo no encontrado"}), 404

        fuel_type = vehicle.fuel_type or "gasoline"
        is_electric = "electric" in fuel_type.lower()

        # ===============================
        # ⚖️ Peso
        # ===============================
        base_weight = vehicle.weight_kg or 1500
        total_weight = base_weight + extra_weight + (passengers * PASSENGER_WEIGHT)

        # ===============================
        # 📏 Distancia
        # ===============================
        distance_km = get_distance_km(origin, destination)
        if distance_km <= 0:
            return jsonify({"error": "Distancia inválida"}), 400

        # ===============================
        # 🌦️ Clima
        # ===============================
        weather_data = get_weather_from_coords(origin)
        climate_label = weather_data["climate"]

        # ===============================
        # 🧭 Segmentos (ELEVATION)
        # ===============================
        try:
            segments = get_route_elevation_segments(polyline)
            print("🧪 SEGMENTS:", segments[:3] if segments else "VACÍO")

            if not segments:
                print("⚠️ No se generaron segmentos, fallback básico")
                segments = [{
                    "distance_km": distance_km,
                    "grade_percent": 0
                }]

        except Exception as e:
            print("❌ ERROR EN SEGMENTOS:", str(e))

            segments = [{
                "distance_km": distance_km,
                "grade_percent": 0
            }]

        # ===============================
        # ⛰️ Perfil elevación
        # ===============================
        try:
            decoded_points = decode_polyline(polyline)
            reduced_points = reduce_points(decoded_points, max_points=100)
            elevations = get_elevation_for_points(reduced_points)

            elevation_profile = build_elevation_profile(
                reduced_points,
                elevations
            )
        except Exception as e:
            print("❌ ERROR PERFIL:", str(e))
            elevation_profile = []

        # ===============================
        # ⛽ Consumo
        # ===============================
        if is_electric:
            fuel_used = 0
            adjusted_consumption = 0
            base_consumption = 0
            total_cost = 0
            consumption_type = "electric"

        else:
            base_data = calculate_trip_consumption(
                vehicle=vehicle,
                total_km=distance_km,
                highway_km=data.get("highway_km")
            )

            base_consumption = base_data["base_consumption"]
            consumption_type = base_data["consumption_type"]

            route_result = calculate_trip_from_segments(
                base_fc=base_consumption,
                segments=segments,
                total_weight=total_weight,
                base_weight=base_weight,
                climate=climate_label,
                engine_type=fuel_type,
            )

            fuel_used = route_result["fuel_used"]
            adjusted_consumption = route_result["adjusted_fc"]

            adjusted_consumption *= max(
                0.7,
                min(vehicle.calibration_factor, 1.3)
            )

            total_cost = fuel_used * fuel_price

        # ===============================
        # 💾 Guardar
        # ===============================
        trip = Trip(
    user_id=user_id,
    vehicle_id=vehicle.id,
    brand=vehicle.make,
    model=vehicle.model,
    year=vehicle.year,
    fuel_type=fuel_type,
    fuel_price=float(fuel_price or 0),
    total_weight=float(total_weight or 0),
    passengers=int(passengers or 0),
    location=f"{origin.get('lat')},{origin.get('lng')}",
    distance=float(distance_km or 0),
    consumption_type=consumption_type,
    base_consumption=float(base_consumption or 0),
    expected_consumption=float(adjusted_consumption or 0),
    adjusted_consumption=float(adjusted_consumption or 0),
    calibration_factor_used=float(vehicle.calibration_factor or 1.0),
    fuel_consumed=float(fuel_used or 0),
    total_cost=float(total_cost or 0),
    weather=climate_label or "unknown",
)

        db.session.add(trip)

        if not UserVehicle.query.filter_by(
            user_id=user_id,
            vehicle_id=vehicle.id
        ).first():
            db.session.add(UserVehicle(
                user_id=user_id,
                vehicle_id=vehicle.id
            ))

        db.session.commit()

        # ===============================
        # 📤 Response
        # ===============================
        return jsonify({
            "distance": round(distance_km, 2),
            "fuelUsed": round(fuel_used, 2),
            "totalCost": round(total_cost, 2),
            "adjustedFC": round(adjusted_consumption, 3),
            "weather": climate_label,
            "segmentsAnalyzed": len(segments),
            "elevationProfile": elevation_profile
        }), 201

    except SQLAlchemyError as e:
        db.session.rollback()

        print("💥 SQL ERROR:")
        traceback.print_exc()

        return jsonify({
            "error": "Error de base de datos",
            "details": str(e)
        }), 500

    except Exception as e:
        print("🔥 ERROR GLOBAL:")
        traceback.print_exc()

        return jsonify({
            "error": str(e),
            "type": type(e).__name__
        }), 500