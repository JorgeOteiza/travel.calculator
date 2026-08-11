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
        # 🔎 VALIDACIÓN
        # ===============================
        required_fields = [
            "brand", "model", "year",
            "origin", "destination",
            "passengers", "route_polyline"
        ]

        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Falta el campo '{field}'"}), 400

        brand = str(data["brand"]).lower().strip()
        model = str(data["model"]).lower().strip()
        year = int(data["year"])
        passengers = int(data["passengers"])

        if passengers < 0 or passengers > MAX_PASSENGERS:
            return jsonify({"error": "Pasajeros inválidos"}), 400

        extra_weight = float(data.get("extra_weight") or 0)
        fuel_price = float(data.get("fuel_price") or 0)

        if fuel_price < 0 or fuel_price > MAX_FUEL_PRICE:
            return jsonify({"error": "Precio de combustible inválido"}), 400

        origin = data["origin"]
        destination = data["destination"]
        polyline = data["route_polyline"]

        if not origin or not destination:
            return jsonify({"error": "Origen o destino inválidos"}), 400

        if not polyline:
            return jsonify({"error": "Polyline inválida"}), 400

        # ===============================
        # 🚗 VEHÍCULO
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
        # ⚖️ PESO
        # ===============================
        base_weight = float(vehicle.weight_kg or 1500)
        total_weight = base_weight + extra_weight + (passengers * PASSENGER_WEIGHT)

        # ===============================
        # 📏 DISTANCIA
        # ===============================
        try:
            distance_km = float(get_distance_km(origin, destination, polyline=polyline))
        except Exception as e:
            print("❌ ERROR DISTANCIA:", e)
            return jsonify({"error": "Error calculando distancia"}), 500

        if distance_km <= 0:
            return jsonify({"error": "Distancia inválida"}), 400

        # ===============================
        # 🌦️ CLIMA
        # ===============================
        try:
            weather_data = get_weather_from_coords(origin)
            climate_label = weather_data.get("climate", "unknown")
        except Exception as e:
            print("❌ ERROR CLIMA:", e)
            climate_label = "unknown"

        # ===============================
        # 🧭 SEGMENTOS (ELEVACIÓN)
        # ===============================
        try:
            segments = get_route_elevation_segments(polyline)

            if not segments:
                segments = [{
                    "distance_km": distance_km,
                    "grade_percent": 0
                }]

        except Exception as e:
            print("❌ ERROR SEGMENTOS:", e)
            segments = [{
                "distance_km": distance_km,
                "grade_percent": 0
            }]

        # ===============================
        # 🛣️ ROAD GRADE (FIX CRÍTICO)
        # ===============================
        try:
            avg_grade = sum(s.get("grade_percent", 0) for s in segments) / len(segments)
        except Exception as e:
            print("⚠️ ERROR calculando road_grade:", e)
            avg_grade = 0

        road_grade = round(avg_grade, 2)

        # ===============================
        # ⛰️ PERFIL ELEVACIÓN
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
            print("❌ ERROR PERFIL:", e)
            elevation_profile = []

        # ===============================
        # ⛽ CONSUMO
        # ===============================
        if is_electric:
            fuel_used = 0.0
            adjusted_consumption = 0.0
            base_consumption = 0.0
            total_cost = 0.0
            consumption_type = "electric"
            consumption_segments = []

        else:
            base_data = calculate_trip_consumption(
                vehicle=vehicle,
                total_km=distance_km,
                highway_km=data.get("highway_km")
            )

            base_consumption = float(base_data.get("base_consumption", 0))
            consumption_type = base_data.get("consumption_type", "mixed")

            route_result = calculate_trip_from_segments(
                base_fc=base_consumption,
                segments=segments,
                total_weight=total_weight,
                base_weight=base_weight,
                climate=climate_label,
                engine_type=fuel_type,
            )

            fuel_used = float(route_result.get("fuel_used", 0))
            adjusted_consumption = float(route_result.get("adjusted_fc", 0))
            consumption_segments = route_result.get("segments", [])

            calibration_factor = float(vehicle.calibration_factor or 1.0)
            calibration_factor = max(0.7, min(calibration_factor, 1.3))

            adjusted_consumption *= calibration_factor
            total_cost = fuel_used * fuel_price

        # ===============================
        # 💾 GUARDAR
        # ===============================
        trip = Trip(
            user_id=user_id,
            vehicle_id=vehicle.id,
            brand=vehicle.make,
            model=vehicle.model,
            year=vehicle.year,
            fuel_type=fuel_type,
            fuel_price=float(fuel_price),
            total_weight=float(total_weight),
            passengers=int(passengers),
            location=f"{origin.get('lat')},{origin.get('lng')}",
            distance=float(distance_km),

            road_grade=road_grade,  # 🔥 FIX

            consumption_type=consumption_type,
            base_consumption=float(base_consumption),
            expected_consumption=float(adjusted_consumption),
            adjusted_consumption=float(adjusted_consumption),
            calibration_factor_used=float(vehicle.calibration_factor or 1.0),
            fuel_consumed=float(fuel_used),
            total_cost=float(total_cost),
            weather=climate_label,
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
        # 📤 RESPONSE
        # ===============================
        return jsonify({
            "id": trip.id,
            "distance": round(distance_km, 2),
            "fuelUsed": round(fuel_used, 2),
            "totalCost": round(total_cost, 2),
            "adjustedFC": round(adjusted_consumption, 3),
            "baseFC": round(base_consumption, 3),
            "weather": climate_label,
            "roadGrade": road_grade,
            "segmentsAnalyzed": len(segments),
            "elevationProfile": elevation_profile,
            "consumptionProfile": consumption_segments,
            "vehicle": {
                "make": vehicle.make,
                "model": vehicle.model,
                "year": vehicle.year,
                "fuel_type": fuel_type,
                "engine_cc": vehicle.engine_cc,
                "weight_kg": vehicle.weight_kg,
                "lkm_mixed": vehicle.lkm_mixed,
            },
            "origin": origin,
            "destination": destination,
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
