from flask import Blueprint, request, jsonify
from .models import db, Trip

main_bp = Blueprint('main_bp', __name__)

@main_bp.route('/api/calculate', methods=['POST'])
def calculate():
    try:
        data = request.json
        vehicle = data.get('vehicle')
        fuel_type = data.get('fuelType')
        location = data.get('location')
        destination = data.get('destinity')
        origin_coords = data.get('coordinates', {}).get('origin')
        dest_coords = data.get('coordinates', {}).get('dest')

        # Validación de los campos
        if not all([vehicle, fuel_type, location, destination, origin_coords, dest_coords]):
            return jsonify({"error": "All fields are required"}), 400

        # Simulación de cálculo
        result = {
            "vehicle": vehicle,
            "fuelType": fuel_type,
            "location": location,
            "distance": 120.5,
            "fuelConsumed": 8.3,
            "totalCost": 25.0,
            "weather": "Sunny",
            "elevation": 200
        }

        # Guardar en la base de datos
        new_trip = Trip(
            vehicle=vehicle,
            fuel_type=fuel_type,
            location=location,
            distance=120.5,
            fuel_consumed=8.3,
            total_cost=25.0
        )
        db.session.add(new_trip)
        db.session.commit()

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
