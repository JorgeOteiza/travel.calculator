from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_cors import cross_origin
from backend.models import db, Trip, Vehicle

trip_bp = Blueprint("trip_bp", __name__)

# ==========================================
# 🔢 Cálculo de viaje (POST)
# ==========================================
@trip_bp.route("/calculate", methods=["POST", "OPTIONS"])
@cross_origin()
@jwt_required()
def calculate_trip():
    if request.method == "OPTIONS":
        return '', 200

    try:
        data = request.get_json()
        user_id = get_jwt_identity()

        required_fields = [
            "brand", "model", "year", "totalWeight",
            "distance", "fuelPrice", "climate", "roadGrade"
        ]
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Falta el campo '{field}'"}), 400

        vehicle = Vehicle.query.filter(
            db.func.lower(Vehicle.make) == data["brand"].strip().lower(),
            db.func.lower(Vehicle.model) == data["model"].strip().lower(),
            Vehicle.year == int(data["year"])
        ).first()

        if not vehicle:
            return jsonify({"error": "No se encontraron detalles del vehículo"}), 404

        if vehicle.fuel_type and "electric" in vehicle.fuel_type.lower():
            return jsonify({
                "error": "Este es un vehículo eléctrico. La simulación de consumo de combustible no aplica."
            }), 400

        if vehicle.lkm_mixed is None:
            return jsonify({
                "error": "No se encontraron datos suficientes para estimar el consumo mixto de este modelo."
            }), 400

        # Base de consumo
        base_fc = vehicle.lkm_mixed
        total_weight = float(data["totalWeight"])
        weight_factor = 1 + ((total_weight + (vehicle.weight_kg or 1500)) / 1500) * 0.1
        adjusted_fc = base_fc * weight_factor

        # Inclinación o declinación
        grade = float(data["roadGrade"])
        if grade > 0:
            adjusted_fc *= 1 + (grade / 100)
        elif grade < 0:
            adjusted_fc *= 1 + (grade / 200)

        # Clima
        climate = data["climate"].lower()
        if climate == "cold":
            adjusted_fc *= 1.10
        elif climate == "hot":
            adjusted_fc *= 1.05
        elif climate == "windy":
            adjusted_fc *= 1.08
        elif climate == "snowy":
            adjusted_fc *= 1.12

        distance_km = float(data["distance"])
        fuel_price = float(data["fuelPrice"])
        fuel_used = (distance_km * adjusted_fc) / 100
        total_cost = fuel_used * fuel_price

        return jsonify({
            "distance": distance_km,
            "fuelConsumptionPer100km": round(adjusted_fc, 3),
            "fuelUsed": round(fuel_used, 3),
            "totalCost": round(total_cost, 3),
            "weather": climate,
            "roadSlope": f"{grade}%",
            "vehicleDetails": {
                "make": vehicle.make,
                "model": vehicle.model,
                "year": vehicle.year,
                "fuel_type": vehicle.fuel_type,
                "engine_cc": vehicle.engine_cc,
                "engine_cylinders": vehicle.engine_cylinders,
                "weight_kg": vehicle.weight_kg,
                "lkm_mixed": vehicle.lkm_mixed,
            }
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==========================================
# 💾 Guardar viaje (POST)
# ==========================================
@trip_bp.route("/trips", methods=["POST"])
@cross_origin()
@jwt_required()
def save_trip():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()

        # Campos requeridos
        required_fields = [
            "brand", "model", "year", "fuel_type", "fuel_price",
            "total_weight", "passengers", "location", "distance",
            "fuel_consumed", "total_cost", "road_grade", "weather"
        ]

        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Falta el campo '{field}'"}), 400

        # Validar valor aceptado de clima
        valid_climates = ["cold", "hot", "windy", "snowy", "mild"]
        if data["weather"].lower() not in valid_climates:
            return jsonify({"error": "Condición climática inválida"}), 400

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
            weather=data["weather"].lower()
        )

        db.session.add(new_trip)
        db.session.commit()

        return jsonify({
            "message": "✅ Viaje guardado exitosamente.",
            "trip": new_trip.to_dict()
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500



# ==========================================
# 📋 Obtener viajes (GET)
# ==========================================
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


# ==========================================
# ❌ Eliminar viaje (DELETE)
# ==========================================
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
