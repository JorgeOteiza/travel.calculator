from flask import Blueprint, request, jsonify
from .models import db, Trip, Brand, Model
import requests
import os

main_bp = Blueprint('main_bp', __name__)
VITE_CAR_API_TOKEN = os.getenv("VITE_CAR_API_TOKEN")

# ✅ Obtener marcas de automóviles desde la API externa con solo el token
@main_bp.route('/api/carsxe/brands', methods=['GET'])
def get_car_brands():
    try:
        make = request.args.get('make')
        if not make or not isinstance(make, str) or make.strip() == "":
            return jsonify({"error": "Parámetro 'make' inválido"}), 400

        # Realizar la petición autenticada usando solo el Token
        response = requests.get(
            "https://api.carsxe.com/specs",
            params={"make": make.strip(), "key": VITE_CAR_API_TOKEN}
        )

        if response.status_code != 200:
            return jsonify({"error": f"Error en la API externa: {response.text}"}), response.status_code

        # Convertir respuesta
        brands = [{"label": item["make"], "value": item["make"]} for item in response.json()]
        return jsonify(brands), 200

    except requests.RequestException as e:
        return jsonify({"error": f"Error de conexión: {str(e)}"}), 500

# ✅ Obtener modelos de un automóvil por marca
@main_bp.route('/api/carsxe/models', methods=['GET'])
def get_car_models():
    try:
        make = request.args.get('make')
        if not make:
            return jsonify({"error": "El parámetro 'make' es obligatorio"}), 400

        response = requests.get(
            "https://api.carsxe.com/specs",
            params={"make": make.strip(), "key": VITE_CAR_API_TOKEN}
        )

        if response.status_code != 200:
            return jsonify({"error": f"Error en la API externa: {response.text}"}), response.status_code

        # Procesar y devolver modelos
        models = [{"label": item.get("model"), "value": item.get("model")} for item in response.json()]
        return jsonify(models), 200

    except requests.RequestException as e:
        return jsonify({"error": f"Error de conexión: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ✅ Calcular viaje
@main_bp.route('/api/calculate', methods=['POST'])
def calculate_trip():
    try:
        data = request.json
        vehicle = data.get('vehicle')
        fuel_type = data.get('fuelType')
        location = data.get('location')
        destination = data.get('destinity')

        if not all([vehicle, fuel_type, location, destination]):
            return jsonify({"error": "All fields are required"}), 400

        # Simulación de distancia y cálculos
        distance_km = 120.5
        fuel_consumed = distance_km * 0.08
        total_cost = fuel_consumed * 1.5

        # Guardar en la base de datos
        new_trip = Trip(
            brand=vehicle.split()[0],
            model=vehicle.split()[1] if len(vehicle.split()) > 1 else "Unknown",
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

# ✅ Obtener todos los viajes
@main_bp.route('/api/trips', methods=['GET'])
def get_trips():
    try:
        trips = Trip.query.all()
        return jsonify([trip.to_dict() for trip in trips]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ✅ Eliminar un viaje
@main_bp.route('/api/trips/<int:trip_id>', methods=['DELETE'])
def delete_trip(trip_id):
    try:
        trip = Trip.query.get(trip_id)
        if not trip:
            return jsonify({"error": "Trip not found"}), 404

        db.session.delete(trip)
        db.session.commit()
        return jsonify({"message": "Trip deleted successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
