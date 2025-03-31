import requests
import json
from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from backend.models import Vehicle, db

car_bp = Blueprint("car_bp", __name__)

NHTSA_API_BASE = "https://vpic.nhtsa.dot.gov/api/vehicles"

def clean_jsonp(response_text):
    try:
        return json.loads(response_text)
    except json.JSONDecodeError:
        return None

TOP_100_BRANDS = {
    "Acura", "Aiways", "Alfa Romeo", "Aston Martin", "Audi", "BMW", "BYD", "Baojun", "Bentley", "Bugatti",
    "Buick", "Cadillac", "Changan", "Chery", "Chevrolet", "Chrysler", "Citroën", "Daewoo", "Daihatsu", "Dodge",
    "Dongfeng", "Eagle", "FAW", "Ferrari", "Fiat", "Fisker", "Ford", "GMC", "Geely", "Genesis",
    "Geo", "Great Wall", "Haval", "Holden", "Honda", "Hummer", "Hyundai", "Infiniti", "Isuzu", "JAC",
    "Jaguar", "Jeep", "Kia", "Koenigsegg", "Lamborghini", "Lancia", "Land Rover", "Leapmotor", "Lexus", "Lincoln",
    "Lucid", "MG", "Mahindra", "MarcaExtra100", "MarcaExtra99", "Maruti Suzuki", "Maxus", "Maybach", "Mazda", "McLaren",
    "Mercedes-Benz", "Mini", "Mitsubishi", "Nio", "Nissan", "Oldsmobile", "Opel", "Pagani", "Perodua", "Peugeot",
    "Plymouth", "Polestar", "Pontiac", "Porsche", "Proton", "Ram", "Renault", "Rivian", "Roewe", "Rolls-Royce",
    "SEAT", "Saab", "Saturn", "Scion", "Seres", "Skoda", "Skywell", "Smart", "Subaru", "Suzuki",
    "Tata", "Tesla", "Toyota", "VinFast", "Volkswagen", "Volvo", "Voyah", "Wuling", "XPeng", "Zotye"
}

@car_bp.route("/brands", methods=["GET"])
@cross_origin()
def get_car_brands():
    try:
        response = requests.get(f"{NHTSA_API_BASE}/getallmakes?format=json")
        if response.status_code != 200:
            return jsonify({"error": f"NHTSA API error: {response.status_code}"}), response.status_code

        data = clean_jsonp(response.text)
        if not data or "Results" not in data or not data["Results"]:
            return jsonify([]), 200

        top_brands_lower = {b.lower() for b in TOP_100_BRANDS}

        brands = [
            {"label": brand["Make_Name"], "value": brand["Make_Name"]}
            for brand in data["Results"]
            if brand["Make_Name"].lower() in top_brands_lower
        ]
        return jsonify(sorted(brands, key=lambda x: x["label"])), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@car_bp.route("/models", methods=["GET"])
@cross_origin()
def get_car_models():
    try:
        make_id = request.args.get("make_id")
        year = request.args.get("year", default=None, type=int)

        if not make_id:
            return jsonify({"error": "El parámetro 'make_id' es obligatorio"}), 400

        if year:
            response = requests.get(f"{NHTSA_API_BASE}/GetModelsForMakeYear/make/{make_id}/modelyear/{year}?format=json")
            if response.status_code != 200:
                return jsonify({"error": f"NHTSA API error: {response.status_code}"}), response.status_code

            data = clean_jsonp(response.text)
            if not data or "Results" not in data or not data["Results"]:
                response = requests.get(f"{NHTSA_API_BASE}/GetModelsForMake/{make_id}?format=json")
                data = clean_jsonp(response.text)
                if not data or "Results" not in data:
                    return jsonify([]), 200
        else:
            response = requests.get(f"{NHTSA_API_BASE}/GetModelsForMake/{make_id}?format=json")
            if response.status_code != 200:
                return jsonify({"error": f"NHTSA API error: {response.status_code}"}), response.status_code

            data = clean_jsonp(response.text)
            if not data or "Results" not in data or not data["Results"]:
                return jsonify([]), 200

        models = [{"label": model["Model_Name"], "value": model["Model_Name"]} for model in data["Results"]]
        return jsonify(models), 200

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

        # Verificar si el vehículo ya existe en la base de datos
        vehicle = Vehicle.query.filter(
            db.func.lower(Vehicle.make) == make.lower(),
            db.func.lower(Vehicle.model) == model.lower(),
            Vehicle.year == year
        ).first()

        if vehicle:
            return jsonify(vehicle.to_dict()), 200

        # Si no existe, registrar vehículo como dummy
        new_vehicle = Vehicle(
            make=make,
            model=model,
            year=year,
            fuel_type=None,
            engine_cc=None,
            engine_cylinders=None,
            weight_kg=None,
            lkm_mixed=None,
            mpg_mixed=None,
        )
        db.session.add(new_vehicle)
        db.session.commit()

        return jsonify(new_vehicle.to_dict()), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
