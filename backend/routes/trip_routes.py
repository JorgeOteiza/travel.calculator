from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_cors import cross_origin
from backend.models import db, Trip, Vehicle

trip_bp = Blueprint("trip_bp", __name__)

@trip_bp.route("/calculate", methods=["POST", "OPTIONS"])
@cross_origin()
@jwt_required()
def calculate_trip():
    if request.method == "OPTIONS":
        return '', 200

    try:
        data = request.get_json()
        user_id = get_jwt_identity()

        required_fields = ["brand", "model", "year", "totalWeight", "distance", "fuelPrice", "climate", "roadGrade"]
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"El campo '{field}' es requerido"}), 400

        make = data["brand"].strip().lower()
        model = data["model"].strip().lower()
        year = int(data["year"])

        vehicle = Vehicle.query.filter(
            db.func.lower(Vehicle.make) == make,
            db.func.lower(Vehicle.model) == model,
            Vehicle.year == year
        ).first()

        if not vehicle:
            return jsonify({"error": "No se encontraron detalles del vehículo"}), 404

        total_weight = float(data["totalWeight"])
        distance_km = float(data["distance"])
        fuel_price = float(data["fuelPrice"])
        climate = data["climate"]
        road_grade = float(data["roadGrade"])

        base_fuel_consumption = vehicle.lkm_mixed if vehicle.lkm_mixed else 8.0
        weight_factor = 1 + ((total_weight + (vehicle.weight_kg or 1500)) / 1500) * 0.1
        adjusted_fuel_consumption = base_fuel_consumption * weight_factor

        if road_grade > 0:
            adjusted_fuel_consumption *= 1 + (road_grade / 10)

        if "cold" in climate.lower():
            adjusted_fuel_consumption *= 1.1
        elif "hot" in climate.lower():
            adjusted_fuel_consumption *= 1.05
        elif "windy" in climate.lower():
            adjusted_fuel_consumption *= 1.08

        fuel_used = (distance_km * adjusted_fuel_consumption) / 100
        total_cost = fuel_used * fuel_price

        vehicle_details = {
            "make": vehicle.make,
            "model": vehicle.model,
            "year": vehicle.year,
            "fuel_type": vehicle.fuel_type,
            "engine_cc": vehicle.engine_cc,
            "engine_cylinders": vehicle.engine_cylinders,
            "weight_kg": vehicle.weight_kg,
            "lkm_mixed": vehicle.lkm_mixed,
        }

        return jsonify({
            "distance": distance_km,
            "fuelConsumptionPer100km": adjusted_fuel_consumption,
            "fuelUsed": fuel_used,
            "totalCost": total_cost,
            "weather": climate,
            "roadSlope": f"{road_grade}%",
            "vehicleDetails": vehicle_details
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@trip_bp.route("/trips", methods=["GET"])
@cross_origin()
@jwt_required()
def get_trips():
    try:
        user_id = get_jwt_identity()
        trips = Trip.query.filter_by(user_id=user_id).all()
        return jsonify([trip.to_dict() for trip in trips]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@trip_bp.route("/trips", methods=["POST"])
@cross_origin()
@jwt_required()
def save_trip():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()

        required_fields = [
            "brand", "model", "year", "fuel_type", "fuel_price",
            "total_weight", "passengers", "location", "distance",
            "fuel_consumed", "total_cost", "road_grade", "weather"
        ]

        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Falta el campo '{field}'"}), 400

        new_trip = Trip(
            user_id=user_id,
            brand=data["brand"],
            model=data["model"],
            year=int(data["year"]),
            fuel_type=data["fuel_type"],
            fuel_price=float(data["fuel_price"]),
            total_weight=float(data["total_weight"]),
            passengers=int(data["passengers"]),
            location=data["location"],
            distance=float(data["distance"]),
            fuel_consumed=float(data["fuel_consumed"]),
            total_cost=float(data["total_cost"]),
            road_grade=float(data["road_grade"]),
            weather=data["weather"]
        )

        db.session.add(new_trip)
        db.session.commit()

        return jsonify({
            "message": "✅ Viaje guardado exitosamente.",
            "trip": new_trip.to_dict()
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@trip_bp.route("/trips/<int:trip_id>", methods=["DELETE"])
@cross_origin()
@jwt_required()
def delete_trip(trip_id):
    try:
        trip = Trip.query.get(trip_id)
        if not trip:
            return jsonify({"error": "El viaje no fue encontrado"}), 404

        db.session.delete(trip)
        db.session.commit()
        return jsonify({"message": "Viaje eliminado exitosamente"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
