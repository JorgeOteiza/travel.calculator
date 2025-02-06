from flask import Blueprint, request, jsonify
from .models import db, Trip, Brand, Model, User
from backend.carAPI_jwt import get_car_api_jwt
import requests
import os

main_bp = Blueprint('main_bp', __name__)

# ✅ Ruta principal
@main_bp.route("/", methods=["GET"])
def home():
    return jsonify({"message": "API Running"}), 200

# ✅ Función para obtener vehículos
def get_vehicles(jwt_token):
    try:
        response = requests.get(
            "https://carapi.app/api/makes",  # Endpoint corregido
            headers={"Authorization": f"Bearer {jwt_token}"}
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error al obtener vehículos: {e}")
        return None


# ✅ Ruta para obtener el JWT
@main_bp.route('/api/auth/login', methods=['POST'])
def get_jwt():
    try:
        jwt_token = get_car_api_jwt()
        if not jwt_token:
            return jsonify({"error": "No se pudo obtener el JWT"}), 500
        return jsonify({"jwt": jwt_token}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ✅ Ruta para obtener vehículos
@main_bp.route('/api/carsxe/vehicles', methods=['GET'])
def get_vehicles_list():
    try:
        jwt_token = get_car_api_jwt()
        if not jwt_token:
            return jsonify({"error": "No se pudo obtener el JWT"}), 500

        vehicles = get_vehicles(jwt_token)
        if not vehicles:
            return jsonify({"error": "No se pudieron obtener los vehículos"}), 500

        return jsonify(vehicles), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ✅ Ruta para obtener marcas
@main_bp.route('/api/carsxe/brands', methods=['GET'])
def get_brands():
    try:
        jwt_token = get_car_api_jwt()
        if not jwt_token:
            return jsonify({"error": "Error al obtener el token JWT"}), 500

        response = requests.get(
            "https://carapi.app/api/makes",
            headers={"Authorization": f"Bearer {jwt_token}"}
        )
        response.raise_for_status()

        return jsonify(response.json()), 200
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Error al conectar con CarAPI: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ✅ Ruta para obtener modelos de vehículos
@main_bp.route('/api/carsxe/models', methods=['GET'])
def get_car_models():
    try:
        make_id = request.args.get('make_id')  # Obtener el ID de la marca
        if not make_id:
            return jsonify({"error": "El parámetro 'make_id' es obligatorio"}), 400

        print(f"✅ Obteniendo modelos para la marca ID: {make_id}")

        # Consulta JSON para filtrar modelos entre 2015 y 2020
        query_filter = [
            {"field": "make_id", "op": "=", "val": make_id},
            {"field": "year", "op": ">=", "val": 2015},
            {"field": "year", "op": "<=", "val": 2020}
        ]

        response = requests.get(
            "https://carapi.app/api/models",
            params={"json": str(query_filter), "verbose": "yes"},
            headers={"Authorization": f"Bearer {get_car_api_jwt()}"}
        )

        print(f"🌐 URL de la solicitud: {response.url}")
        print(f"✅ Estado de la respuesta: {response.status_code}")
        print(f"📥 Respuesta de la API: {response.text[:500]}")

        response.raise_for_status()

        data = response.json()
        if "data" not in data:
            return jsonify({"error": "La respuesta de la API no contiene datos de modelos"}), 500

        # Filtrar solo los modelos que no están ocultos
        models = []
        for item in data.get('data', []):
            model_name = item.get("name", "")
            if "(hidden)" not in model_name:
                models.append({
                    "label": model_name,
                    "value": item.get("id")
                })

        print(f"📊 Modelos visibles obtenidos: {models[:5]}")

        # Manejo en caso de que todos los modelos estén ocultos
        if not models:
            return jsonify({"message": "No se encontraron modelos visibles para esta marca."}), 200

        return jsonify(models), 200

    except requests.exceptions.RequestException as e:
        print(f"🚨 Error de conexión con la API externa: {e}")
        return jsonify({"error": f"Error de conexión con la API de vehículos: {str(e)}"}), 500
    except Exception as e:
        print(f"⚠️ Error inesperado: {e}")
        return jsonify({"error": str(e)}), 500



        # ✅ Verificación del contenido JSON recibido
        data = response.json()
        if "data" not in data:
            return jsonify({"error": "La respuesta de la API no contiene datos de modelos"}), 500

        # ✅ Formatear los modelos para el frontend
        models = [{"label": item.get("name"), "value": item.get("id")} for item in data.get('data', [])]

        print(f"Modelos obtenidos: {models[:5]}")  # 🔍 Mostrar los primeros 5 modelos obtenidos

        return jsonify(models), 200

    except requests.exceptions.RequestException as e:
        print(f"Error de conexión con la API externa: {e}")  # 🔍 Error de red
        return jsonify({"error": f"Error de conexión con la API de vehículos: {str(e)}"}), 500
    except Exception as e:
        print(f"Error inesperado: {e}")  # 🔍 Cualquier otro error inesperado
        return jsonify({"error": str(e)}), 500


# ✅ Ruta para calcular el viaje
@main_bp.route('/api/calculate', methods=['POST'])
def calculate_trip():
    try:
        data = request.json
        brand = data.get('brand')
        model = data.get('model')
        fuel_type = data.get('fuelType')
        location = data.get('location')
        destination = data.get('destinity')

        # ✅ Verificar que todos los campos estén completos
        if not all([brand, model, fuel_type, location, destination]):
            return jsonify({"error": "Todos los campos son requeridos"}), 400

        # Simulación de distancia y cálculos
        distance_km = 120.5
        fuel_consumed = distance_km * 0.08
        total_cost = fuel_consumed * 1.5

        new_trip = Trip(
            brand=brand,
            model=model,
            fuel_type=fuel_type,
            location=location,
            distance=distance_km,
            fuel_consumed=fuel_consumed,
            total_cost=total_cost
        )
        db.session.add(new_trip)
        db.session.commit()

        return jsonify(new_trip.to_dict()), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500



# ✅ Ruta para obtener todos los viajes
@main_bp.route('/api/trips', methods=['GET'])
def get_trips():
    try:
        trips = Trip.query.all()
        return jsonify([trip.to_dict() for trip in trips]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ✅ Ruta para eliminar un viaje
@main_bp.route('/api/trips/<int:trip_id>', methods=['DELETE'])
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
