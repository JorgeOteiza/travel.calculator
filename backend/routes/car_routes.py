from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from backend.extensions import db
from backend.models import Vehicle
from backend.services.consumption_service import is_vehicle_calculation_ready

car_bp = Blueprint("car_bp", __name__)
# ===============================
# BRANDS
# ===============================
@car_bp.route("/brands", methods=["GET"])
@cross_origin()
def get_car_brands():
    makes = {
        vehicle.make
        for vehicle in Vehicle.query.all()
        if is_vehicle_calculation_ready(vehicle)
    }
    return jsonify([
        {"label": make, "value": make}
        for make in sorted(makes, key=str.lower)
    ]), 200


# ===============================
# MODELS
# ===============================
@car_bp.route("/models", methods=["GET"])
@cross_origin()
def get_car_models():
    make = request.args.get("make_id")
    if not make:
        return jsonify({"error": "Falta el parámetro make_id"}), 400

    models = {
        vehicle.model
        for vehicle in Vehicle.query.filter(db.func.lower(Vehicle.make) == make.lower()).all()
        if is_vehicle_calculation_ready(vehicle)
    }
    return jsonify([
        {"label": model, "value": model}
        for model in sorted(models, key=str.lower)
    ]), 200


# ===============================
# MODEL DETAILS (DB → API → FALLBACK)
# ===============================
@car_bp.route("/model_details", methods=["GET"])
@cross_origin()
def get_model_details():
    try:
        make = request.args.get("make")
        model = request.args.get("model")
        year = request.args.get("year", type=int)

        if not make or not model or not year:
            return jsonify({"error": "Faltan parámetros"}), 400

        vehicle = Vehicle.query.filter(
            db.func.lower(Vehicle.make) == make.lower(),
            db.func.lower(Vehicle.model) == model.lower(),
            Vehicle.year == year
        ).first()

        if not vehicle:
            return jsonify({
                "error": "Vehículo no disponible aún"
            }), 404

        if not is_vehicle_calculation_ready(vehicle):
            return jsonify({
                "error": "Vehículo sin datos suficientes para calcular"
            }), 422

        return jsonify({
            "make": vehicle.make,
            "model": vehicle.model,
            "year": vehicle.year,
            "fuel_type": vehicle.fuel_type,
            "engine_cc": vehicle.engine_cc,
            "cylinders": vehicle.engine_cylinders,
            "weight_kg": vehicle.weight_kg,
            "lkm_mixed": vehicle.lkm_mixed,
            "lkm_highway": vehicle.lkm_highway,
            "source": "db",
        }), 200

    except Exception as e:
        print(f"[ERROR] /model_details: {e}")
        return jsonify({"error": "Error obteniendo vehículo"}), 500



# ===============================
# ALL VEHICLES
# ===============================
@car_bp.route("/vehicles", methods=["GET"])
def get_vehicles():
    vehicles = [
        vehicle for vehicle in Vehicle.query.all()
        if is_vehicle_calculation_ready(vehicle)
    ]
    return jsonify([
        {
            "id": v.id,
            "make": v.make,
            "model": v.model,
            "year": v.year,
            "fuel_type": v.fuel_type,
            "engine_cc": v.engine_cc,
            "weight_kg": v.weight_kg,
            "lkm_mixed": v.lkm_mixed,
            "lkm_highway": v.lkm_highway,
        }
        for v in vehicles
    ]), 200
