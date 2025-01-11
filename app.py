import os
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import requests
from dotenv import load_dotenv

# Cargar variables de entorno desde .env
load_dotenv()

app = Flask(__name__)
CORS(app)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Modelo de la base de datos
class Trip(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    vehicle = db.Column(db.String(80), nullable=False)
    fuel_type = db.Column(db.String(20), nullable=False)
    location = db.Column(db.String(120), nullable=False)
    distance = db.Column(db.Float, nullable=False)
    fuel_consumed = db.Column(db.Float, nullable=False)
    total_cost = db.Column(db.Float, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "vehicle": self.vehicle,
            "fuel_type": self.fuel_type,
            "location": self.location,
            "distance": self.distance,
            "fuel_consumed": self.fuel_consumed,
            "total_cost": self.total_cost
        }

# Inicialización de la base de datos
with app.app_context():
    db.create_all()

# ✅ Obtener todas las marcas de Car API usando un proxy para evitar CORS
@app.route('/api/carsxe/brands', methods=['GET'])
def get_car_brands():
    try:
        car_api_key = os.getenv('CAR_API_TOKEN')
        response = requests.get(f"https://api.carsxe.com/specs?key={car_api_key}")
        if response.status_code == 200:
            return jsonify(response.json()), 200
        return jsonify({"error": "Failed to fetch brands"}), response.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ✅ Obtener todos los registros
@app.route('/api/trips', methods=['GET'])
def get_trips():
    try:
        trips = Trip.query.all()
        return jsonify([trip.to_dict() for trip in trips]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ✅ Obtener un viaje por ID
@app.route('/api/trips/<int:trip_id>', methods=['GET'])
def get_trip_by_id(trip_id):
    try:
        trip = Trip.query.get(trip_id)
        if not trip:
            return jsonify({"error": "Trip not found"}), 404
        return jsonify(trip.to_dict()), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ✅ POST: Calcular viaje con validación y llamada a Car API
@app.route('/api/calculate', methods=['POST'])
def calculate_trip():
    try:
        data = request.json
        vehicle = data.get('vehicle')
        fuel_type = data.get('fuelType')
        origin = data.get('origin')
        destination = data.get('destinity')

        if not all([vehicle, fuel_type, origin, destination]):
            return jsonify({"error": "All fields are required"}), 400

        # Datos simulados para cálculo
        distance_km = 120.5
        fuel_consumed = distance_km * 0.08
        total_cost = fuel_consumed * 1.5

        # Guardar en la base de datos
        new_trip = Trip(
            vehicle=vehicle,
            fuel_type=fuel_type,
            location=origin,
            distance=distance_km,
            fuel_consumed=fuel_consumed,
            total_cost=total_cost
        )
        db.session.add(new_trip)
        db.session.commit()

        return jsonify(new_trip.to_dict()), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ✅ Actualizar un viaje existente por ID
@app.route('/api/trips/<int:trip_id>', methods=['PUT'])
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
@app.route('/api/trips/<int:trip_id>', methods=['DELETE'])
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

# Iniciar servidor
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
