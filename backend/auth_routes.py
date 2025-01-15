from flask import Blueprint, request, jsonify
from werkzeug.security import check_password_hash
import jwt
import datetime
import os

auth_bp = Blueprint('auth_bp', __name__)
SECRET_KEY = os.getenv('SECRET_KEY')

# Simulación de usuarios en base de datos (debes conectar con Postgres)
users_db = {
    "jorge": {
        "password": "pbkdf2:sha256:260000$examplehash",  # Contraseña hasheada
    }
}

# Ruta para autenticación de usuarios
@auth_bp.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    if username not in users_db or not check_password_hash(users_db[username]["password"], password):
        return jsonify({"error": "Credenciales inválidas"}), 401

    # Generar JWT propio
    token = jwt.encode(
        {"username": username, "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=1)},
        SECRET_KEY,
        algorithm="HS256"
    )
    return jsonify({"jwt": token})

# Middleware para proteger rutas
def token_required(f):
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization")
        if not token:
            return jsonify({"error": "Token faltante"}), 403

        try:
            jwt.decode(token.split(" ")[1], SECRET_KEY, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expirado"}), 403
        except jwt.InvalidTokenError:
            return jsonify({"error": "Token inválido"}), 403

        return f(*args, **kwargs)

    decorated.__name__ = f.__name__
    return decorated
