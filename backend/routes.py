import requests
import json
from flask_cors import cross_origin
from flask_jwt_extended import jwt_required
from flask import Blueprint, request, jsonify
from backend.models import db, Trip, User, Vehicle
from backend.auth_routes import token_required

CARQUERY_API_URL = "https://www.carqueryapi.com/api/0.3/"

def clean_jsonp(response_text):
    try:
        start = response_text.find("{")
        end = response_text.rfind("}") + 1
        json_text = response_text[start:end]
        return json.loads(json_text)
    except Exception as e:
        print(f"🚨 Error al limpiar JSONP: {e}")
        return None

main_bp = Blueprint("main_bp", __name__)

@main_bp.route("/", methods=["GET"])
def home():
    return jsonify({"message": "API Running"}), 200


@main_bp.route('/carsxe/brands', methods=['GET'])
@cross_origin()
def get_car_brands():
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36"
        }
        year = request.args.get("year", default=2024, type=int)

        params = {"cmd": "getMakes", "year": year, "callback": "?"}
        response = requests.get(CARQUERY_API_URL, params=params, headers=headers)

        print(f"🔍 Código de estado HTTP: {response.status_code}")
        print(f"🔍 Respuesta cruda de CarQuery API: {response.text}")

        if response.status_code != 200:
            print(f"🚨 Error en la API de CarQuery: {response.status_code}")
            return jsonify({"error": f"Error en la API de CarQuery: {response.status_code}"}), response.status_code

        data = clean_jsonp(response.text)

        if not data or "Makes" not in data or not data["Makes"]:
            print("🚨 No se encontraron marcas para el año seleccionado. Probando sin año...")
            params.pop("year")  # Reintentar sin año
            response = requests.get(CARQUERY_API_URL, params=params, headers=headers)
            data = clean_jsonp(response.text)

            if not data or "Makes" not in data:
                return jsonify([]), 200

        brands = [{"label": brand["make_display"], "value": brand["make_id"]} for brand in data["Makes"]]
        print(f"✅ Marcas obtenidas: {len(brands)}")
        return jsonify(brands), 200

    except requests.exceptions.RequestException as e:
        print(f"🚨 Error de conexión con CarQuery: {e}")
        return jsonify({"error": f"Error al conectar con CarQuery: {str(e)}"}), 500
    except Exception as e:
        print(f"🚨 Error inesperado en get_car_brands: {e}")
        return jsonify({"error": f"Error inesperado: {str(e)}"}), 500


@main_bp.route('/carsxe/models', methods=['GET'])
@cross_origin()
def get_car_models():
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36"
        }
        make_id = request.args.get('make_id')
        year = request.args.get("year", default=2024, type=int)

        if not make_id:
            return jsonify({"error": "El parámetro 'make_id' es obligatorio"}), 400

        params = {"cmd": "getModels", "make": make_id, "year": year, "callback": "?"}
        response = requests.get(CARQUERY_API_URL, params=params, headers=headers)

        print(f"🔍 Código de estado HTTP: {response.status_code}")

        if response.status_code != 200:
            return jsonify({"error": f"Error en la API de CarQuery: {response.status_code}"}), response.status_code

        data = clean_jsonp(response.text)
        
        if not data or "Models" not in data or not data["Models"]:
            print("🚨 No se encontraron modelos para la marca y año seleccionados. Probando sin año...")
            params.pop("year")  # 🔄 Reintentar sin año
            response = requests.get(CARQUERY_API_URL, params=params, headers=headers)
            data = clean_jsonp(response.text)

            if not data or "Models" not in data:
                return jsonify([]), 200

        models = [{"label": model["model_name"], "value": model["model_name"]} for model in data["Models"]]
        return jsonify(models), 200

    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Error al conectar con CarQuery: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"Error inesperado: {str(e)}"}), 500



# ✅ Obtener detalles de un modelo específico
@main_bp.route("/carsxe/model_details", methods=["GET"])
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
        db.session.add(new_vehicle)
        db.session.commit()

        return jsonify(new_vehicle.to_dict()), 200

    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Error al conectar con CarQuery: {str(e)}"}), 500

# ✅ Calcular el viaje basado en múltiples factores
@main_bp.route("/calculate", methods=["POST"])
@token_required
def calculate_trip(current_user):
    try:
        data = request.get_json()

        # 🔹 1. Validar los datos recibidos
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
        road_grade = data["roadGrade"]  # Inclinación de la carretera en porcentaje

        # 🔹 2. Obtener detalles del vehículo desde la base de datos
        vehicle = Vehicle.query.filter_by(make=make, model=model, year=year).first()
        if not vehicle:
            return jsonify({"error": "No se encontraron detalles del vehículo"}), 404

        # 🔹 3. Calcular el consumo base de combustible
        base_fuel_consumption = vehicle.lkm_mixed if vehicle.lkm_mixed else 8  # l/100km
        weight_factor = 1 + ((total_weight + (vehicle.weight_kg or 1500)) / 1500) * 0.1
        adjusted_fuel_consumption = base_fuel_consumption * weight_factor

        # 🔹 4. Ajuste por inclinación del camino
        if road_grade > 0:
            incline_factor = 1 + (road_grade / 10)  # Aumento del consumo por cada 10% de inclinación
        else:
            incline_factor = 1

        adjusted_fuel_consumption *= incline_factor

        # 🔹 5. Ajuste por clima (temperatura y viento)
        if "cold" in climate.lower():
            adjusted_fuel_consumption *= 1.1  # Aumento del 10% en clima frío
        elif "hot" in climate.lower():
            adjusted_fuel_consumption *= 1.05  # Aumento del 5% en clima caluroso
        elif "windy" in climate.lower():
            adjusted_fuel_consumption *= 1.08  # Aumento del 8% si hay viento fuerte

        # 🔹 6. Cálculo de combustible total usado
        fuel_used = (distance_km * adjusted_fuel_consumption) / 100

        # 🔹 7. Cálculo del costo total del viaje
        total_cost = fuel_used * fuel_price

        return jsonify({
            "distance": distance_km,
            "fuelConsumptionPer100km": adjusted_fuel_consumption,
            "fuelUsed": fuel_used,
            "totalCost": total_cost
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ✅ Obtener todos los viajes
@main_bp.route("/trips", methods=["GET"])
@cross_origin()
@jwt_required()
def get_trips():
    try:
        trips = Trip.query.all()
        return jsonify([trip.to_dict() for trip in trips]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ✅ Eliminar un viaje
@main_bp.route("/trips/<int:trip_id>", methods=["DELETE"])
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
