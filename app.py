import os
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from dotenv import load_dotenv
from backend.models import db, Trip  # Asegúrate que el path sea correcto y el archivo models.py esté accesible

# Cargar las variables de entorno desde el archivo .env
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuración de la base de datos usando variables de entorno
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = os.getenv('SQLALCHEMY_TRACK_MODIFICATIONS') == 'True'

# Inicializar la base de datos
db.init_app(app)

@app.route('/api/calculate', methods=['POST'])
def calculate():
    try:
        data = request.json
        vehicle = data.get('vehicle')
        fuel_type = data.get('fuelType')
        location = data.get('location')

        # Validación básica
        if not vehicle or not fuel_type or not location:
            return jsonify({"error": "All fields are required"}), 400

        # Crear un nuevo registro en la base de datos
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

        # Resultado simulado con datos de prueba
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

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/trips', methods=['GET'])
def get_trips():
    """Endpoint para obtener todos los viajes registrados."""
    try:
        trips = Trip.query.all()
        return jsonify([trip.to_dict() for trip in trips]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    # Crear la base de datos y tablas antes de iniciar el servidor
    with app.app_context():
        db.create_all()
        print("Base de datos inicializada correctamente.")
    app.run(debug=True, host='0.0.0.0', port=5000)
