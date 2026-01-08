from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_cors import cross_origin
from sqlalchemy.exc import SQLAlchemyError

from backend.models import db, Trip, Vehicle, UserVehicle
from backend.utils.trip_calculation import calculate_fuel_consumption

trip_bp = Blueprint("trip_bp", __name__)


# ==========================================
# 🔢 Cálculo de viaje (POST)
# ==========================================
@trip_bp.route("/calculate", methods=["POST", "OPTIONS"])
@cross_origin()
@jwt_required()
def calculate_trip():
    if request.method == "OPTIONS":
        return "", 200

    try:
        data = request.get_json()
        user_id = get_jwt_identity()

        required_fields = [
            "brand", "model", "year",
            "totalWeight", "distance",
            "roadGrade", "climate"
        ]
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Falta el campo obligatorio '{field}'"}), 400

        # 🔹 Normalización de entrada
        brand = data["brand"].strip().lower()
        model = data["model"].strip().lower()
        year = int(data["year"])
        distance_km = float(data["distance"])
        grade = float(data["roadGrade"])
        climate = data["climate"].lower()
        extra_weight = float(data["totalWeight"])
        fuel_price = float(data.get("fuelPrice", 0))

        # 🔹 Buscar vehículo
        vehicle = Vehicle.query.filter(
            db.func.lower(Vehicle.make) == brand,
            db.func.lower(Vehicle.model) == model,
            Vehicle.year == year
        ).first()

        if not vehicle:
            return jsonify({"error": "No se encontraron detalles del vehículo"}), 404

        if vehicle.fuel_type and "electric" in vehicle.fuel_type.lower():
            return jsonify({
                "error": "Este es un vehículo eléctrico. No aplica simulación de combustible."
            }), 400

        if vehicle.lkm_mixed is None:
            return jsonify({
                "error": "No hay datos suficientes de consumo para este vehículo."
            }), 400

        # 🔹 Cálculo real centralizado
        adjusted_fc = calculate_fuel_consumption(
            base_fc=vehicle.lkm_mixed,
            vehicle_weight=vehicle.weight_kg or 1500,
            extra_weight=max(0, extra_weight),
            road_grade=grade,
            climate=climate,
            distance_km=distance_km,
            engine_type=vehicle.fuel_type
        )

        fuel_used = (distance_km * adjusted_fc) / 100
        total_cost = fuel_used * fuel_price

        # 🔹 Asociación usuario–vehículo
        if not UserVehicle.query.filter_by(
            user_id=user_id,
            vehicle_id=vehicle.id
        ).first():
            db.session.add(UserVehicle(
                user_id=user_id,
                vehicle_id=vehicle.id
            ))
            db.session.commit()

        return jsonify({
            "distance": distance_km,
            "fuelConsumptionPer100km": round(adjusted_fc, 3),
            "fuelUsed": round(fuel_used, 3),
            "totalCost": round(total_cost, 2),
            "weather": climate,
            "roadSlope": f"{grade}%",
            "baseFC": round(vehicle.lkm_mixed, 2),
            "adjustedFC": round(adjusted_fc, 2),
            "pricePerLitre": round(fuel_price, 2),
            "vehicleDetails": vehicle.to_dict()
        }), 200

    except SQLAlchemyError as db_err:
        print(f"❌ SQLAlchemy error: {db_err}")
        return jsonify({"error": "Error interno de base de datos"}), 500

    except Exception as e:
        print(f"❌ Error general en /calculate: {e}")
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

        required = [
            "brand", "model", "year", "fuel_type",
            "total_weight", "passengers", "location",
            "distance", "fuel_consumed", "total_cost",
            "road_grade", "climate"
        ]

        for field in required:
            if field not in data:
                return jsonify({"error": f"Falta el campo obligatorio '{field}'"}), 400

        valid_climates = ["cold", "hot", "windy", "snowy", "mild"]
        if data["climate"].lower() not in valid_climates:
            return jsonify({"error": "Condición climática inválida"}), 400

        is_electric = "electric" in data["fuel_type"].lower()
        if not is_electric and "fuel_price" not in data:
            return jsonify({"error": "Falta el campo 'fuel_price' para vehículos no eléctricos"}), 400

        trip = Trip(
            user_id=user_id,
            brand=data["brand"].strip().capitalize(),
            model=data["model"].strip().capitalize(),
            year=int(data["year"]),
            fuel_type=data["fuel_type"],
            fuel_price=float(data.get("fuel_price") or 0),
            total_weight=float(data["total_weight"]),
            passengers=int(data["passengers"]),
            location=data["location"],
            distance=float(data["distance"]),
            fuel_consumed=float(data["fuel_consumed"]),
            total_cost=float(data["total_cost"]),
            road_grade=float(data["road_grade"]),
            weather=data["climate"].lower()
        )

        db.session.add(trip)
        db.session.commit()

        return jsonify({
            "message": "✅ Viaje guardado exitosamente.",
            "trip": trip.to_dict()
        }), 201

    except Exception as e:
        print(f"❌ Error interno al guardar viaje: {e}")
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
        trips = Trip.query.filter_by(
            user_id=user_id
        ).order_by(Trip.id.desc()).all()

        results = []
        for trip in trips:
            trip_data = trip.to_dict()
            if hasattr(trip, "created_at"):
                trip_data["created_at"] = trip.created_at.strftime("%Y-%m-%d %H:%M:%S")
            results.append(trip_data)

        return jsonify(results), 200

    except Exception as e:
        print(f"❌ Error interno en /trips: {e}")
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
