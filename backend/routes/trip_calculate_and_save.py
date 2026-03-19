from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_cors import cross_origin
from sqlalchemy.exc import SQLAlchemyError

from backend.models import db, Trip, Vehicle, UserVehicle
from backend.services.distance_service import get_distance_km
from backend.services.weather_service import get_weather_from_coords
from backend.services.consumption_service import calculate_trip_consumption
from backend.services.route_elevation_service import get_route_elevation_segments
from backend.services.route_consumption_service import calculate_route_consumption

# 🔥 NUEVOS IMPORTS
from backend.services.polyline_service import decode_polyline, reduce_points
from backend.services.elevation_profile import get_elevation_for_points
from backend.services.elevation_profile_chart_service import build_elevation_profile

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
        # 🧭 Segmentos (consumo)
        # ===============================
        segments = get_route_elevation_segments(polyline)

        # ===============================
        # ⛰️ PERFIL DE ELEVACIÓN (NUEVO)
        # ===============================
        decoded_points = decode_polyline(polyline)
        reduced_points = reduce_points(decoded_points, max_points=100)

        elevations = get_elevation_for_points(reduced_points)

        elevation_profile = build_elevation_profile(
            reduced_points,
            elevations
        )

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

            route_result = calculate_route_consumption(
                segments=segments,
                vehicle=vehicle,
                base_consumption=base_consumption,
                total_weight=total_weight,
                base_weight=base_weight,
                climate=climate_label,
                fuel_type=fuel_type,
            )

            fuel_used = route_result["fuel_used"]
            adjusted_consumption = route_result["adjusted_fc"]

            adjusted_consumption *= max(
                0.7,
                min(vehicle.calibration_factor, 1.3)
            )

            fuel_used = (distance_km * adjusted_consumption) / 100
            total_cost = fuel_used * fuel_price

        # ===============================
        # 💾 Persistencia
        # ===============================
        trip = Trip(
            user_id=user_id,
            vehicle_id=vehicle.id,
            brand=vehicle.make,
            model=vehicle.model,
            year=vehicle.year,
            fuel_type=fuel_type,
            fuel_price=fuel_price,
            total_weight=total_weight,
            passengers=passengers,
            location=f"{origin['lat']},{origin['lng']}",
            distance=distance_km,
            consumption_type=consumption_type,
            base_consumption=base_consumption,
            expected_consumption=adjusted_consumption,
            adjusted_consumption=adjusted_consumption,
            calibration_factor_used=vehicle.calibration_factor,
            fuel_consumed=fuel_used,
            total_cost=total_cost,
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
            "distance": round(distance_km, 2),
            "fuelUsed": round(fuel_used, 2),
            "totalCost": round(total_cost, 2),
            "adjustedFC": round(adjusted_consumption, 3),
            "weather": climate_label,
            "segmentsAnalyzed": len(segments),
            "elevationProfile": elevation_profile  # 🔥 NUEVO
        }), 201

    except SQLAlchemyError:
        db.session.rollback()
        return jsonify({"error": "Error de base de datos"}), 500

    except Exception as e:
        return jsonify({"error": str(e)}), 500