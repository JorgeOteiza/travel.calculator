import os
import json
import requests
import unicodedata
from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from backend.models import db, Vehicle

car_bp = Blueprint("car_bp", __name__)
NHTSA_BASE_URL = "https://vpic.nhtsa.dot.gov/api/vehicles"

# Cargar archivos de marcas permitidas
TOP_BRANDS_PATH = os.path.join(os.path.dirname(__file__), "../data/top_50_brands.json")
NORMALIZED_MAP_PATH = os.path.join(os.path.dirname(__file__), "../data/normalized_brands.json")

with open(TOP_BRANDS_PATH, encoding="utf-8") as f:
    ALLOWED_BRANDS_ORIGINAL = json.load(f)

with open(NORMALIZED_MAP_PATH, encoding="utf-8") as f:
    NORMALIZED_BRAND_MAP = json.load(f)

ALLOWED_BRANDS_NORMALIZED = set(NORMALIZED_BRAND_MAP.keys())

# Función para normalizar texto
def normalize(text):
    return unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("utf-8").strip().lower()


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


@car_bp.route("/models", methods=["GET"])
@cross_origin()
def get_car_models():
    try:
        make = request.args.get("make_id")
        if not make:
            return jsonify({"error": "Falta el parámetro make_id"}), 400

        # Normalizar y validar
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


@car_bp.route("/model_details", methods=["GET"])
@cross_origin()
def get_model_details():
    try:
        make = request.args.get("make")
        model = request.args.get("model")
        year = request.args.get("year", type=int)

        if not make or not model or not year:
            return jsonify({"error": "Faltan parámetros 'make', 'model' o 'year'"}), 400

        norm_make = normalize(make)
        mapped_make = NORMALIZED_BRAND_MAP.get(norm_make, make)

        print(f"[DEBUG] Normalizado: '{make}' → '{mapped_make}'")

        vehicle = Vehicle.query.filter(
            db.func.lower(Vehicle.make) == mapped_make.lower(),
            db.func.lower(Vehicle.model) == model.lower(),
            Vehicle.year == year
        ).first()

        # 🛠️ Si existe pero no tiene datos suficientes, actualizarlo
        if vehicle:
            updated = False

            if vehicle.lkm_mixed is None:
                vehicle.lkm_mixed = 6.5  # valor por defecto
                updated = True

            if vehicle.weight_kg is None:
                vehicle.weight_kg = 1200
                updated = True

            if updated:
                db.session.commit()
                print("[DEBUG] Vehículo existente actualizado con valores de referencia.")

            return jsonify(vehicle.to_dict()), 200

        # Si no existe, consultar a NHTSA
        url = (
            f"{NHTSA_BASE_URL}/GetVehicleTypesForMakeModelYear/"
            f"make/{mapped_make}/model/{model}/modelyear/{year}?format=json"
        )
        print(f"[DEBUG] Consulta externa: {url}")

        response = requests.get(url)
        if response.status_code != 200:
            print(f"[ERROR] Falló consulta a NHTSA: {response.status_code}")
            return jsonify({"error": "Error consultando detalles en NHTSA", "url": url}), 500

        result = response.json().get("Results", [])
        if not result:
            print(f"[WARN] Sin resultados para: {url}")
            return jsonify({"error": "No se encontraron detalles", "url": url}), 404

        first = result[0]
        fuel_type = first.get("FuelTypePrimary", "Gasoline")
        if fuel_type.lower() in ["electric", "battery electric"]:
            fuel_type = "Electric"

        # Crear con datos de referencia
        new_vehicle = Vehicle(
            make=mapped_make,
            model=model,
            year=year,
            fuel_type=fuel_type,
            engine_cc=None,
            engine_cylinders=None,
            weight_kg=1200,
            lkm_mixed=6.5,
            mpg_mixed=None
        )
        db.session.add(new_vehicle)
        db.session.commit()

        print("[DEBUG] Vehículo nuevo guardado con datos de referencia.")
        return jsonify(new_vehicle.to_dict()), 200

    except Exception as e:
        print(f"[ERROR] Excepción en /model_details: {e}")
        return jsonify({"error": str(e)}), 500
