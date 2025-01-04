from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from backend.models import db, Trip  # Importa `db` desde `models.py`

app = Flask(__name__)
CORS(app)

# Configuración de la base de datos
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://usuario:contraseña@localhost/travelcalculator'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Inicializar SQLAlchemy
db.init_app(app)

@app.route('/api/calculate', methods=['POST'])
def calculate():
    data = request.json
    # Datos enviados desde el frontend
    vehicle = data.get('vehicle')
    fuel_type = data.get('fuelType')
    location = data.get('location')

    # Lógica para procesar datos y realizar cálculos (puedes ajustarla según sea necesario)
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
