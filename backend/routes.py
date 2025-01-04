from flask import Blueprint, request, jsonify
from .models import db, Trip

main_bp = Blueprint('main_bp', __name__)

@main_bp.route('/api/calculate', methods=['POST'])
def calculate():
    data = request.json
    vehicle = data.get('vehicle')
    fuel_type = data.get('fuelType')
    location = data.get('location')

    # Lógica simplificada para responder con datos simulados
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
    return jsonify(result), 200
