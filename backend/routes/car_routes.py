import os
import requests
import json
from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from backend.models import db, Vehicle

car_bp = Blueprint("car_bp", __name__)
NHTSA_BASE_URL = "https://vpic.nhtsa.dot.gov/api/vehicles"
TOP_BRANDS_PATH = os.path.join(os.path.dirname(__file__), "../data/top_50_brands.json")

with open(TOP_BRANDS_PATH, encoding="utf-8") as f:
    ALLOWED_BRANDS = set(json.load(f))


@car_bp.route("/brands", methods=["GET"])
@cross_origin()
def get_car_brands():
    try:
        response = requests.get(f"{NHTSA_BASE_URL}/getallmakes?format=json")
        if response.status_code != 200:
            return jsonify([]), 500

        all_brands = response.json().get("Results", [])
        filtered = [
            {"label": b["Make_Name"], "value": b["Make_Name"]}
            for b in all_brands
            if b["Make_Name"] in ALLOWED_BRANDS
        ]
        return jsonify(sorted(filtered, key=lambda x: x["label"])), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@car_bp.route("/models", methods=["GET"])
@cross_origin()
def get_car_models():
    try:
        make = request.args.get("make_id")
        if not make:
            return jsonify({"error": "Falta el parámetro make_id"}), 400

        response = requests.get(
            f"{NHTSA_BASE_URL}/getmodelsformake/{make}?format=json"
        )
        if response.status_code != 200:
            return jsonify([], 500)

        models = response.json().get("Results", [])
        result = [
            {"label": m["Model_Name"], "value": m["Model_Name"]} for m in models
        ]
        return jsonify(sorted(result, key=lambda x: x["label"])), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@car_bp.route("/model_details", methods=["GET"])
@cross_origin()
def get_model_details():
    try:
        make = request.args.get("make")
        model = request.args.get("model")
        year = request.args.get("year", type=int)

        if not make or not model or not year:
            return jsonify({"error": "Faltan parámetros 'make', 'model' o 'year'"}), 400

        # 1. Verificar si ya existe en la BD local
        vehicle = Vehicle.query.filter(
            db.func.lower(Vehicle.make) == make.lower(),
            db.func.lower(Vehicle.model) == model.lower(),
            Vehicle.year == year
        ).first()

        if vehicle:
            return jsonify(vehicle.to_dict()), 200

        # 2. Consultar NHTSA si no existe localmente
        response = requests.get(
            f"{NHTSA_BASE_URL}/GetVehicleTypesForMakeModelYear/make/{make}/model/{model}/modelyear/{year}?format=json"
        )
        if response.status_code != 200:
            return jsonify({"error": "Error consultando detalles en NHTSA"}), 500

        result = response.json().get("Results", [])
        if not result:
            return jsonify({"error": "No se encontraron detalles"}), 404

        # 3. Extraer campos básicos
        first = result[0]
        fuel_type = first.get("FuelTypePrimary", "Gasoline")
        vehicle_type = first.get("VehicleTypeName", "")

        # Si es eléctrico, evitar errores en el cálculo posterior
        if fuel_type.lower() in ["electric", "battery electric"]:
            fuel_type = "Electric"

        new_vehicle = Vehicle(
            make=make,
            model=model,
            year=year,
            fuel_type=fuel_type,
            engine_cc=None,
            engine_cylinders=None,
            weight_kg=None,
            lkm_mixed=None,
            mpg_mixed=None
        )

        db.session.add(new_vehicle)
        db.session.commit()
        return jsonify(new_vehicle.to_dict()), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
