import os
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from dotenv import load_dotenv

# Cargar variables de entorno desde .env
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuración de la base de datos usando las variables de entorno
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Inicialización de la base de datos
db = SQLAlchemy(app)

# Definición del modelo de base de datos
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

# Crear las tablas al iniciar la app
with app.app_context():
    db.create_all()

# ✅ GET: Obtener todos los registros
@app.route('/api/trips', methods=['GET'])
def get_trips():
    try:
        trips = Trip.query.all()
        return jsonify([trip.to_dict() for trip in trips]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ✅ GET: Obtener un viaje específico por ID
@app.route('/api/trips/<int:trip_id>', methods=['GET'])
def get_trip_by_id(trip_id):
    try:
        trip = Trip.query.get(trip_id)
        if not trip:
            return jsonify({"error": "Trip not found"}), 404
        return jsonify(trip.to_dict()), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ✅ POST: Crear un nuevo viaje
@app.route('/api/calculate', methods=['POST'])
def calculate_trip():
    try:
        data = request.json
        vehicle = data.get('vehicle')
        fuel_type = data.get('fuelType')
        origin = data.get('origin')
        destination = data.get('destinity')

        # Validación básica de datos
        if not all([vehicle, fuel_type, origin, destination]):
            return jsonify({"error": "All fields are required"}), 400

        # Datos de ejemplo (simulación)
        distance_km = 120.5
        fuel_consumed = distance_km * 0.08
        total_cost = fuel_consumed * 1.5

        # Crear un nuevo viaje
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

# ✅ PUT: Actualizar un viaje existente por ID
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

# ✅ DELETE: Eliminar un viaje por ID
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

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
