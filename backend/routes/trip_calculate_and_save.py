from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_cors import cross_origin
from sqlalchemy.exc import SQLAlchemyError

from backend.models import db, Trip, Vehicle, UserVehicle
from backend.utils.trip_calculation import calculate_fuel_consumption
from backend.services.distance_service import get_distance_km
from backend.services.elevation_service import get_elevation_difference
from backend.services.weather_service import get_weather_from_coords
from backend.services.consumption_service import calculate_trip_consumption


trip_calc_and_save_bp = Blueprint("trip_calc_and_save_bp", __name__)

PASSENGER_WEIGHT = 75          # kg promedio por pasajero
MAX_PASSENGERS = 8
MAX_FUEL_PRICE = 5000


@trip_calc_and_save_bp.route("/trips/calculate-and-save", methods=["POST"])
@cross_origin()
@jwt_required()
def calculate_and_save_trip():
    try:
        user_id = get_jwt_identity()
        data = request.get_json() or {}

        # =====================================================
        # 🔹 Validaciones mínimas de entrada
        # =====================================================
        required_fields = [
            "brand", "model", "year",
            "origin", "destination",
            "passengers"
        ]

        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Falta el campo '{field}'"}), 400

        brand = data["brand"].strip().lower()
        model = data["model"].strip().lower()
        year = int(data["year"])

        passengers = int(data["passengers"])
        if passengers < 0 or passengers > MAX_PASSENGERS:
            return jsonify({
                "error": "Cantidad de pasajeros inválida (0–8)"
            }), 400

        extra_weight = float(data.get("extra_weight", 0))
        fuel_price = float(data.get("fuel_price", 0))

        if fuel_price < 0 or fuel_price > MAX_FUEL_PRICE:
            return jsonify({
                "error": "Precio de combustible fuera de rango"
            }), 400

        origin = data["origin"]
        destination = data["destination"]

        # =====================================================
        # 🔹 Vehículo
        # =====================================================
        vehicle = Vehicle.query.filter(
            db.func.lower(Vehicle.make) == brand,
            db.func.lower(Vehicle.model) == model,
            Vehicle.year == year,
        ).first()

        if not vehicle:
            return jsonify({"error": "Vehículo no encontrado"}), 404

        fuel_type = vehicle.fuel_type or "gasoline"
        is_electric = "electric" in fuel_type.lower()

        # =====================================================
        # 🔹 Peso total
        # =====================================================
        base_weight = vehicle.weight_kg or 1500
        total_weight = base_weight + extra_weight + (passengers * PASSENGER_WEIGHT)

        # =====================================================
        # 🔹 Distancia y pendiente
        # =====================================================
        distance_km = get_distance_km(origin, destination)
        if not distance_km or distance_km <= 0:
            return jsonify({"error": "Distancia inválida"}), 400

        elevation_diff = get_elevation_difference(origin, destination)
        road_grade = round(
            (elevation_diff / (distance_km * 1000)) * 100,
            2
        )

        # =====================================================
        # 🔹 Clima
        # =====================================================
        weather_data = get_weather_from_coords(origin)
        climate_label = weather_data["climate"]
        weather_raw = weather_data["raw"]

        # =====================================================
        # 🔹 Consumo (solo combustión)
        # =====================================================
        if is_electric:
            consumption_type = "electric"
            base_consumption = 0
            adjusted_consumption = 0
            fuel_used = 0
            total_cost = 0
        else:
            consumption_data = calculate_trip_consumption(
                vehicle=vehicle,
                total_km=distance_km,
                highway_km=data.get("highway_km")
            )

            consumption_type = consumption_data["consumption_type"]
            base_consumption = consumption_data["base_consumption"]

            adjusted_consumption = calculate_fuel_consumption(
                base_fc=base_consumption,
                vehicle_weight=base_weight,
                extra_weight=total_weight - base_weight,
                road_grade=road_grade,
                climate=climate_label,
                distance_km=distance_km,
                engine_type=fuel_type,
            )

            # 🎯 Auto-calibración por vehículo
            adjusted_consumption *= max(
                0.7,
                min(vehicle.calibration_factor, 1.3)
            )

            fuel_used = (distance_km * adjusted_consumption) / 100
            total_cost = fuel_used * fuel_price

        # =====================================================
        # 🔹 Persistencia
        # =====================================================
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
            adjusted_consumption=adjusted_consumption,
            calibration_factor_used=vehicle.calibration_factor,
            fuel_consumed=fuel_used,
            total_cost=total_cost,
            road_grade=road_grade,
            weather=climate_label,
        )

        db.session.add(trip)

        if not UserVehicle.query.filter_by(
            user_id=user_id,
            vehicle_id=vehicle.id
        ).first():
            db.session.add(
                UserVehicle(
                    user_id=user_id,
                    vehicle_id=vehicle.id
                )
            )

        db.session.commit()

        # =====================================================
        # 🔹 Response
        # =====================================================
        return jsonify({
            "distance": round(distance_km, 2),
            "fuelUsed": round(fuel_used, 2),
            "totalCost": round(total_cost, 2),
            "consumptionType": consumption_type,
            "baseFC": base_consumption,
            "adjustedFC": round(adjusted_consumption, 3),
            "roadGrade": f"{road_grade}%",
            "weather": climate_label,
            "pricePerLitre": fuel_price,
            "weatherRaw": weather_raw,
            "vehicle": {
                "make": vehicle.make,
                "model": vehicle.model,
                "year": vehicle.year,
                "fuel_type": vehicle.fuel_type,
                "engine_cc": vehicle.engine_cc,
                "cylinders": vehicle.engine_cylinders,
                "weight_kg": vehicle.weight_kg,
                "lkm_mixed": vehicle.lkm_mixed,
                "lkm_highway": vehicle.lkm_highway,
            },
            "consumption": {
                "type": consumption_type,
                "base_l_per_100km": base_consumption
            },
        }), 201

    except SQLAlchemyError as e:
        db.session.rollback()
        print("❌ DB error:", e)
        return jsonify({"error": "Error de base de datos"}), 500

    except Exception as e:
        print("❌ Error cálculo viaje:", e)
        return jsonify({"error": str(e)}), 500
