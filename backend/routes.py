import requests
import json
from flask import Blueprint, request, jsonify
from backend.models import db, Trip, User
from backend.auth_routes import token_required

main_bp = Blueprint("main_bp", __name__)

CARQUERY_API_URL = "https://www.carqueryapi.com/api/0.3/"

# ✅ Ruta principal
@main_bp.route("/", methods=["GET"])
def home():
    return jsonify({"message": "API Running"}), 200

# ✅ Nueva función para limpiar JSONP y obtener JSON válido
def clean_jsonp(response_text):
    try:
        start = response_text.find("{")
        end = response_text.rfind("}") + 1
        json_text = response_text[start:end]
        return json.loads(json_text)  # Convertir a JSON
    except Exception as e:
        print(f"🚨 Error al limpiar JSONP: {e}")
        return None

# ✅ Ruta para obtener marcas desde CarQuery API usando Flask como proxy
@main_bp.route('/api/carsxe/brands', methods=['GET'])
def get_car_brands():
    try:
        headers = {
            "User-Agent": request.headers.get("User-Agent", "Mozilla/5.0"),
            "Accept": "application/json"
        }
        response = requests.get(f"{CARQUERY_API_URL}?cmd=getMakes", headers=headers)

        if response.status_code != 200:
            return jsonify({"error": f"Error en la API de CarQuery: {response.status_code}"}), response.status_code

        data = clean_jsonp(response.text)

        if not data or "Makes" not in data:
            return jsonify({"error": "No se encontraron marcas en la API"}), 500

        brands = [{"label": brand["make_display"], "value": brand["make_id"]} for brand in data["Makes"]]
        return jsonify(brands), 200

    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Error al conectar con CarQuery: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"Error inesperado: {str(e)}"}), 500


# ✅ Ruta para obtener modelos de una marca
@main_bp.route('/api/carsxe/models', methods=['GET'])
def get_car_models():
    try:
        make_id = request.args.get('make_id')

        if not make_id:
            return jsonify({"error": "El parámetro 'make_id' es obligatorio"}), 400

        print(f"✅ Obteniendo modelos para la marca: {make_id}")

        headers = {
            "User-Agent": request.headers.get("User-Agent", "Mozilla/5.0"),
            "Accept": "application/json"
        }
        response = requests.get(f"{CARQUERY_API_URL}?cmd=getModels&make={make_id}", headers=headers)

        if response.status_code != 200:
            return jsonify({"error": f"Error en la API de CarQuery: {response.status_code}"}), response.status_code

        # ✅ Limpiar JSONP y convertirlo en JSON válido
        data = clean_jsonp(response.text)

        if not data or "Models" not in data:
            return jsonify({"error": "No se encontraron modelos para esta marca"}), 500

        models = [{"label": model["model_name"], "value": model["model_name"]} for model in data["Models"]]
        
        return jsonify(models), 200

    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Error al conectar con CarQuery: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"Error inesperado: {str(e)}"}), 500


# ✅ Ruta para obtener detalles de un modelo específico
@main_bp.route("/api/carsqe/model_details", methods=["GET"])
def get_model_details():
    try:
        model_name = request.args.get("model")
        if not model_name:
            return jsonify({"error": "El parámetro 'model' es obligatorio"}), 400

        url = f"{CARQUERY_API_URL}?cmd=getTrims&model={model_name}&full_results=1"
        response = requests.get(url)
        response.raise_for_status()

        data = response.json()

        if "Trims" not in data:
            return jsonify({"error": "No se encontraron detalles para este modelo"}), 500

        return jsonify(data["Trims"]), 200
    except requests.exceptions.RequestException as e:
        print(f"🚨 Error obteniendo detalles del modelo: {e}")
        return jsonify({"error": "Error al obtener detalles del modelo"}), 500

# ✅ Ruta para calcular el viaje
@main_bp.route("/api/calculate", methods=["POST"])
@token_required 
def calculate_trip(current_user):
    try:
        data = request.json
        print("📡 Datos recibidos en /api/calculate:", data)

        # Se obtiene el ID del usuario autenticado desde el decorador
        user_id = current_user.id
        if not user_id:
            print("🚨 Usuario no autenticado, se requiere iniciar sesión.")
            return jsonify({"error": "Usuario no autenticado. Inicia sesión para continuar."}), 401

        brand = data.get("brand")
        model = data.get("model")
        fuel_type = data.get("fuelType")
        location = data.get("location")
        destination = data.get("destinity")

        if not all([brand, model, fuel_type, location, destination]):
            print("🚨 Falta información en la solicitud:", data)
            return jsonify({"error": "Todos los campos son requeridos"}), 400

        # Simulación de cálculo
        distance_km = 120.5
        fuel_consumed = distance_km * 0.08
        total_cost = fuel_consumed * 1.5

        new_trip = Trip(
            user_id=user_id,  # ✅ Se usa el ID del usuario autenticado
            brand=brand,
            model=model,
            fuel_type=fuel_type,
            location=location,
            distance=distance_km,
            fuel_consumed=fuel_consumed,
            total_cost=total_cost,
        )
        db.session.add(new_trip)
        db.session.commit()

        print("✅ Viaje registrado exitosamente:", new_trip)
        return jsonify(new_trip.to_dict()), 201

    except Exception as e:
        print(f"🚨 Error en el cálculo del viaje: {e}")
        return jsonify({"error": str(e)}), 500

# ✅ Ruta para obtener todos los viajes
@main_bp.route("/api/trips", methods=["GET"])
def get_trips():
    try:
        trips = Trip.query.all()
        return jsonify([trip.to_dict() for trip in trips]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ✅ Ruta para eliminar un viaje
@main_bp.route("/api/trips/<int:trip_id>", methods=["DELETE"])
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
