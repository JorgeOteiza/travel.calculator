from flask import Blueprint, request, jsonify
from .models import db, Trip
import requests
import os

main_bp = Blueprint('main_bp', __name__)

# ✅ Proxy para obtener marcas de vehículos (para evitar CORS)
@main_bp.route('/api/carsxe/brands', methods=['GET'])
def get_car_brands():
    make = request.args.get('make')
    if not make:
        return jsonify({"error": "Brand name is required"}), 400

    car_api_token = os.getenv('CAR_API_TOKEN')
    response = requests.get(f"https://api.carsxe.com/specs?make={make}&key={car_api_token}")

    if response.status_code != 200:
        return jsonify({"error": "Error fetching car brands from Car API"}), response.status_code

    return response.json()

# ✅ Proxy para obtener modelos de vehículos basados en la marca
@main_bp.route('/api/carsxe/models', methods=['GET'])
def get_car_models():
    make = request.args.get('make')
    if not make:
        return jsonify({"error": "Brand name is required"}), 400

    car_api_token = os.getenv('CAR_API_TOKEN')
    response = requests.get(f"https://api.carsxe.com/specs?make={make}&key={car_api_token}")

    if response.status_code != 200:
        return jsonify({"error": "Error fetching car models from Car API"}), response.status_code

    return response.json()

# ✅ Calcular viaje con validación y proxy seguro
@main_bp.route('/api/calculate', methods=['POST'])
def calculate_trip():
    try:
        data = request.json
        vehicle = data.get('vehicle')
        fuel_type = data.get('fuelType')
        location = data.get('location')
        destination = data.get('destinity')
        origin_coords = data.get('coordinates', {}).get('origin')
        dest_coords = data.get('coordinates', {}).get('dest')

        # Validación de campos
        if not all([vehicle, fuel_type, location, destination, origin_coords, dest_coords]):
            return jsonify({"error": "All fields are required"}), 400

        # Simulación de cálculo de viaje
        distance_km = 120.5
        fuel_consumed = distance_km * 0.08
        total_cost = fuel_consumed * 1.5

        # Guardar en la base de datos
        new_trip = Trip(
            vehicle=vehicle,
            fuel_type=fuel_type,
            location=location,
            distance=distance_km,
            fuel_consumed=fuel_consumed,
            total_cost=total_cost
        )
        db.session.add(new_trip)
        db.session.commit()

        # Respuesta al cliente con resultados simulados
        result = {
            "vehicle": vehicle,
            "fuelType": fuel_type,
            "location": location,
            "distance": distance_km,
            "fuelConsumed": fuel_consumed,
            "totalCost": total_cost,
            "weather": "Sunny",
            "elevation": 200
        }

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ✅ Obtener todos los registros de viajes
@main_bp.route('/api/trips', methods=['GET'])
def get_trips():
    try:
        trips = Trip.query.all()
        return jsonify([trip.to_dict() for trip in trips]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ✅ Obtener un viaje por ID
@main_bp.route('/api/trips/<int:trip_id>', methods=['GET'])
def get_trip_by_id(trip_id):
    try:
        trip = Trip.query.get(trip_id)
        if not trip:
            return jsonify({"error": "Trip not found"}), 404
        return jsonify(trip.to_dict()), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ✅ Actualizar un viaje existente por ID
@main_bp.route('/api/trips/<int:trip_id>', methods=['PUT'])
def update_trip(trip_id):
    try:
        trip = Trip.query.get(trip_id)
        if not trip:
            return jsonify({"error": "Trip not found"}), 404

        data = request.json
        trip.vehicle = data.get('vehicle', trip.vehicle)
        trip.fuel_type = data.get('fuelType', trip.fuel_type)
        trip.location = data.get('location', trip.location)
        trip.distance = data.get('distance', trip.distance)
        trip.fuel_consumed = data.get('fuelConsumed', trip.fuel_consumed)
        trip.total_cost = data.get('totalCost', trip.total_cost)

        db.session.commit()
        return jsonify(trip.to_dict()), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ✅ Eliminar un viaje por ID
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
