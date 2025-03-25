import requests
import json
from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from backend.models import Vehicle

CARQUERY_API_URL = "https://www.carqueryapi.com/api/0.3/"

car_bp = Blueprint("car_bp", __name__)

def clean_jsonp(response_text):
    try:
        start = response_text.find("{")
        end = response_text.rfind("}") + 1
        json_text = response_text[start:end]
        return json.loads(json_text) if json_text else None
    except Exception as e:
        print(f"🚨 Error al limpiar JSONP: {e}")
        return None

@car_bp.route("/brands", methods=["GET"])
@cross_origin()
def get_car_brands():
    try:
        headers = {
            "User-Agent": "Mozilla/5.0"
        }
        year = request.args.get("year", default=2024, type=int)
        params = {"cmd": "getMakes", "year": year, "callback": "?"}
        response = requests.get(CARQUERY_API_URL, params=params, headers=headers)

        if response.status_code != 200:
            return jsonify({"error": f"Error en CarQuery: {response.status_code}"}), response.status_code

        data = clean_jsonp(response.text)

        if not data or "Makes" not in data or not data["Makes"]:
            params.pop("year")
            response = requests.get(CARQUERY_API_URL, params=params, headers=headers)
            data = clean_jsonp(response.text)
            if not data or "Makes" not in data:
                return jsonify([]), 200

        brands = [{"label": b["make_display"], "value": b["make_id"]} for b in data["Makes"]]
        return jsonify(brands), 200

    except Exception as e:
        return jsonify({"error": f"Error inesperado: {str(e)}"}), 500

@car_bp.route("/models", methods=["GET"])
@cross_origin()
def get_car_models():
    try:
        headers = {
            "User-Agent": "Mozilla/5.0"
        }
        make_id = request.args.get('make_id')
        year = request.args.get("year", default=2024, type=int)

        if not make_id:
            return jsonify({"error": "El parámetro 'make_id' es obligatorio"}), 400

        params = {"cmd": "getModels", "make": make_id, "year": year, "callback": "?"}
        response = requests.get(CARQUERY_API_URL, params=params, headers=headers)

        if response.status_code != 200:
            return jsonify({"error": f"Error en CarQuery: {response.status_code}"}), response.status_code

        data = clean_jsonp(response.text)

        if not data or "Models" not in data or not data["Models"]:
            params.pop("year")
            response = requests.get(CARQUERY_API_URL, params=params, headers=headers)
            data = clean_jsonp(response.text)
            if not data or "Models" not in data:
                return jsonify([]), 200

        models = [{"label": m["model_name"], "value": m["model_name"]} for m in data["Models"]]
        return jsonify(models), 200

    except Exception as e:
        return jsonify({"error": f"Error inesperado: {str(e)}"}), 500

@car_bp.route("/model_details", methods=["GET"])
@cross_origin()
def get_model_details():
    try:
        model_name = request.args.get("model")
        if not model_name:
            return jsonify({"error": "El parámetro 'model' es obligatorio"}), 400

        vehicle = Vehicle.query.filter_by(model=model_name).first()
        if vehicle:
            return jsonify(vehicle.to_dict()), 200

        params = {"cmd": "getTrims", "model": model_name, "full_results": 1}
        response = requests.get(CARQUERY_API_URL, params=params)
        data = clean_jsonp(response.text)

        if not data or "Trims" not in data:
            return jsonify({"error": "No se encontraron detalles para este modelo"}), 404

        model_details = data["Trims"][0]
        new_vehicle = Vehicle(
            make=model_details.get("make_display"),
            model=model_details.get("model_name"),
            year=model_details.get("model_year"),
            fuel_type=model_details.get("model_engine_fuel"),
            engine_cc=model_details.get("model_engine_cc"),
            engine_cylinders=model_details.get("model_engine_cyl"),
            weight_kg=model_details.get("model_weight_kg"),
            lkm_mixed=model_details.get("model_lkm_mixed"),
            mpg_mixed=model_details.get("model_mpg_mixed"),
        )
        from backend.models import db
        db.session.add(new_vehicle)
        db.session.commit()

        return jsonify(new_vehicle.to_dict()), 200

    except Exception as e:
        return jsonify({"error": f"Error: {str(e)}"}), 500
