import os
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from dotenv import load_dotenv
from backend.models import db, Trip  # Asegúrate de que el path sea correcto

# Cargar las variables del archivo .env
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuración de la base de datos usando .env
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = os.getenv('SQLALCHEMY_TRACK_MODIFICATIONS') == 'True'

# Inicializar la base de datos
db.init_app(app)

@app.route('/api/calculate', methods=['POST'])
def calculate():
    data = request.json
    vehicle = data.get('vehicle')
    fuel_type = data.get('fuelType')
    location = data.get('location')

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

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, host='0.0.0.0', port=5000)
