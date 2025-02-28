from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import datetime
import os
from backend.models import db, User
from functools import wraps

auth_bp = Blueprint('auth_bp', __name__)

# 🔹 Garantizar que SECRET_KEY nunca sea None
SECRET_KEY = os.getenv('SECRET_KEY', 'default_secret_key')

def token_required(f):
    """ Middleware para verificar el token JWT en rutas protegidas """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization")
        if not token:
            return jsonify({"error": "Token faltante"}), 403

        try:
            decoded = jwt.decode(token.split(" ")[1], SECRET_KEY, algorithms=["HS256"])
            current_user = User.query.get(decoded['user_id'])  # 🔹 Ahora busca por ID en lugar de email
            if not current_user:
                return jsonify({"error": "Usuario no encontrado"}), 403
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expirado"}), 403
        except jwt.InvalidTokenError:
            return jsonify({"error": "Token inválido"}), 403

        return f(current_user, *args, **kwargs)
    return decorated

# ✅ Registro de usuario
@auth_bp.route('/api/register', methods=['POST'])
def register():
    data = request.json
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")

    if not all([name, email, password]):
        return jsonify({"error": "Todos los campos son obligatorios"}), 400

    # Verificar si el usuario ya existe
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"error": "El correo ya está registrado"}), 409

    # Crear usuario
    hashed_password = generate_password_hash(password)  # 🔹 Se usa directamente aquí
    new_user = User(name=name, email=email, password_hash=hashed_password)
    
    db.session.add(new_user)
    db.session.commit()

    # 🔹 Generar token JWT con user_id en payload
    token = jwt.encode(
        {"user_id": new_user.id, "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=2)},
        SECRET_KEY,
        algorithm="HS256"
    )

    return jsonify({
        "message": "Usuario registrado exitosamente",
        "jwt": token,
        "user": {"id": new_user.id, "name": new_user.name, "email": new_user.email}
    }), 201

# ✅ Inicio de sesión
@auth_bp.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get("email")
    password = data.get("password")

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Credenciales inválidas"}), 401

    # 🔹 Generar un nuevo token JWT con ID en lugar de email
    token = jwt.encode(
        {"user_id": user.id, "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=2)},
        SECRET_KEY,
        algorithm="HS256"
    )

    return jsonify({
        "jwt": token,
        "user": {"id": user.id, "name": user.name, "email": user.email}
    }), 200

# ✅ Ruta protegida para obtener datos del usuario
@auth_bp.route('/api/user', methods=['GET'])
@token_required
def get_user(current_user):
    return jsonify({
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email
    })
