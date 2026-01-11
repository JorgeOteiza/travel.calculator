import os
import json
import requests
import unicodedata
from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from backend.extensions import cache, db
from backend.models import Vehicle

car_bp = Blueprint("car_bp", __name__)
NHTSA_BASE_URL = "https://vpic.nhtsa.dot.gov/api/vehicles"

# ===============================
# CARGA DE CONFIGURACIÓN
# ===============================
TOP_BRANDS_PATH = os.path.join(os.path.dirname(__file__), "../data/top_50_brands.json")
NORMALIZED_MAP_PATH = os.path.join(os.path.dirname(__file__), "../data/normalized_brands.json")

with open(TOP_BRANDS_PATH, encoding="utf-8") as f:
    ALLOWED_BRANDS_ORIGINAL = json.load(f)

with open(NORMALIZED_MAP_PATH, encoding="utf-8") as f:
    NORMALIZED_BRAND_MAP = json.load(f)

ALLOWED_BRANDS_NORMALIZED = set(NORMALIZED_BRAND_MAP.keys())


def normalize(text):
    return (
        unicodedata.normalize("NFKD", text)
        .encode("ascii", "ignore")
        .decode("utf-8")
        .strip()
        .lower()
    )

# ===============================
# BRANDS
# ===============================
@car_bp.route("/brands", methods=["GET"])
@cross_origin()
def get_car_brands():
    try:
        response = requests.get(f"{NHTSA_BASE_URL}/getallmakes?format=json")
        if response.status_code != 200:
            return jsonify([]), 500

        all_brands = response.json().get("Results", [])
        filtered = []

        for b in all_brands:
            make_name = b["Make_Name"]
            norm = normalize(make_name)
            if norm in ALLOWED_BRANDS_NORMALIZED:
                original = NORMALIZED_BRAND_MAP[norm]
                filtered.append({"label": original, "value": original})

        return jsonify(sorted(filtered, key=lambda x: x["label"])), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ===============================
# MODELS
# ===============================
@car_bp.route("/models", methods=["GET"])
@cross_origin()
def get_car_models():
    try:
        make = request.args.get("make_id")
        if not make:
            return jsonify({"error": "Falta el parámetro make_id"}), 400

        normalized = normalize(make)
        if normalized not in NORMALIZED_BRAND_MAP:
            return jsonify({"error": f"Marca '{make}' no permitida"}), 400

        mapped_make = NORMALIZED_BRAND_MAP[normalized]

        response = requests.get(
            f"{NHTSA_BASE_URL}/getmodelsformake/{mapped_make}?format=json"
        )
        if response.status_code != 200:
            return jsonify([], 500)

        models = response.json().get("Results", [])
        result = [{"label": m["Model_Name"], "value": m["Model_Name"]} for m in models]

        return jsonify(sorted(result, key=lambda x: x["label"])), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


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

        norm_make = normalize(make)
        mapped_make = NORMALIZED_BRAND_MAP.get(norm_make, make)

        vehicle = Vehicle.query.filter(
            db.func.lower(Vehicle.make) == mapped_make.lower(),
            db.func.lower(Vehicle.model) == model.lower(),
            Vehicle.year == year
        ).first()

        if not vehicle:
            return jsonify({
                "error": "Vehículo no disponible aún"
            }), 404

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
@cache.cached(timeout=300, key_prefix="all_vehicles")
def get_vehicles():
    vehicles = Vehicle.query.all()
    return jsonify([
        {
            "id": v.id,
            "make": v.make,
            "model": v.model,
            "year": v.year
        }
        for v in vehicles
    ]), 200
