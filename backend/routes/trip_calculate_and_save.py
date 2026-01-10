from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_cors import cross_origin
from sqlalchemy.exc import SQLAlchemyError

from backend.models import db, Trip, Vehicle, UserVehicle
from backend.utils.trip_calculation import calculate_fuel_consumption
from backend.services.distance_service import get_distance_km
from backend.services.elevation_service import get_elevation_difference
from backend.services.weather_service import get_climate_from_coords

trip_calc_and_save_bp = Blueprint("trip_calc_and_save_bp", __name__)

PASSENGER_WEIGHT = 75  # kg promedio por pasajero


@trip_calc_and_save_bp.route("/trips/calculate-and-save", methods=["POST"])
@cross_origin()
@jwt_required()
def calculate_and_save_trip():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()

        required_fields = [
            "brand",
            "model",
            "year",
            "origin",
            "destination",
            "extra_weight",
            "passengers",
        ]

        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Falta el campo '{field}'"}), 400

        brand = data["brand"].strip().lower()
        model = data["model"].strip().lower()
        year = int(data["year"])

        origin = data["origin"]
        destination = data["destination"]

        passengers = int(data["passengers"])
        extra_weight = float(data.get("extra_weight", 0))
        fuel_price = float(data.get("fuel_price", 0))

        vehicle = Vehicle.query.filter(
            db.func.lower(Vehicle.make) == brand,
            db.func.lower(Vehicle.model) == model,
            Vehicle.year == year,
        ).first()

        if not vehicle:
            return jsonify({"error": "Vehículo no encontrado"}), 404

        fuel_type = vehicle.fuel_type or "gasoline"
        is_electric = "electric" in fuel_type.lower()

        real_total_weight = (
            (vehicle.weight_kg or 1500)
            + extra_weight
            + (passengers * PASSENGER_WEIGHT)
        )

        distance_km = get_distance_km(origin, destination)

        elevation_diff = get_elevation_difference(origin, destination)
        road_grade = (
            round((elevation_diff / (distance_km * 1000)) * 100, 2)
            if distance_km
            else 0
        )

        climate = get_climate_from_coords(origin)

        if is_electric:
            adjusted_fc = 0
            fuel_used = 0
            total_cost = 0
        else:
            adjusted_fc = calculate_fuel_consumption(
                base_fc=vehicle.lkm_mixed,
                vehicle_weight=vehicle.weight_kg or 1500,
                extra_weight=real_total_weight - (vehicle.weight_kg or 1500),
                road_grade=road_grade,
                climate=climate,
                distance_km=distance_km,
                engine_type=fuel_type,
            )

            fuel_used = (distance_km * adjusted_fc) / 100
            total_cost = fuel_used * fuel_price

        trip = Trip(
            user_id=user_id,
            brand=vehicle.make,
            model=vehicle.model,
            year=vehicle.year,
            fuel_type=fuel_type,
            fuel_price=fuel_price,
            total_weight=real_total_weight,
            passengers=passengers,
            location=f"{origin['lat']},{origin['lng']}",
            distance=distance_km,
            fuel_consumed=fuel_used,
            total_cost=total_cost,
            road_grade=road_grade,
            weather=climate,
        )

        db.session.add(trip)

        if not UserVehicle.query.filter_by(
            user_id=user_id, vehicle_id=vehicle.id
        ).first():
            db.session.add(
                UserVehicle(user_id=user_id, vehicle_id=vehicle.id)
            )

        db.session.commit()

        return jsonify(
            {
                "distance": round(distance_km, 2),
                "fuelUsed": round(fuel_used, 3),
                "totalCost": round(total_cost, 2),
                "baseFC": vehicle.lkm_mixed,
                "adjustedFC": round(adjusted_fc, 3),
                "roadGrade": f"{road_grade}%",
                "weather": climate,
                "realTotalWeight": round(real_total_weight, 1),
                "vehicle": vehicle.to_dict(),
            }
        ), 201

    except SQLAlchemyError as e:
        db.session.rollback()
        print("❌ DB error:", e)
        return jsonify({"error": "Error de base de datos"}), 500

    except Exception as e:
        print("❌ Error cálculo viaje:", e)
        return jsonify({"error": str(e)}), 500
