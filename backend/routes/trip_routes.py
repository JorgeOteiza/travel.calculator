from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_cors import cross_origin
from backend.models import db, Trip, Vehicle

trip_bp = Blueprint("trip_bp", __name__)

@trip_bp.route("/calculate", methods=["POST"])
@cross_origin()
@jwt_required()
def calculate_trip():
    try:
        data = request.get_json()
        user_id = get_jwt_identity()

        required_fields = ["brand", "model", "year", "totalWeight", "distance", "fuelPrice", "climate", "roadGrade"]
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"El campo '{field}' es requerido"}), 400

        make = data["brand"]
        model = data["model"]
        year = data["year"]
        total_weight = data["totalWeight"]
        distance_km = data["distance"]
        fuel_price = data["fuelPrice"]
        climate = data["climate"]
        road_grade = data["roadGrade"]

        vehicle = Vehicle.query.filter_by(make=make, model=model, year=year).first()
        if not vehicle:
            return jsonify({"error": "No se encontraron detalles del vehículo"}), 404

        base_fuel_consumption = vehicle.lkm_mixed if vehicle.lkm_mixed else 8
        weight_factor = 1 + ((total_weight + (vehicle.weight_kg or 1500)) / 1500) * 0.1
        adjusted_fuel_consumption = base_fuel_consumption * weight_factor

        if road_grade > 0:
            incline_factor = 1 + (road_grade / 10)
        else:
            incline_factor = 1
        adjusted_fuel_consumption *= incline_factor

        if "cold" in climate.lower():
            adjusted_fuel_consumption *= 1.1
        elif "hot" in climate.lower():
            adjusted_fuel_consumption *= 1.05
        elif "windy" in climate.lower():
            adjusted_fuel_consumption *= 1.08

        fuel_used = (distance_km * adjusted_fuel_consumption) / 100
        total_cost = fuel_used * fuel_price

        return jsonify({
            "distance": distance_km,
            "fuelConsumptionPer100km": adjusted_fuel_consumption,
            "fuelUsed": fuel_used,
            "totalCost": total_cost
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@trip_bp.route("/trips", methods=["GET"])
@cross_origin()
@jwt_required()
def get_trips():
    try:
        trips = Trip.query.all()
        return jsonify([trip.to_dict() for trip in trips]), 200
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
