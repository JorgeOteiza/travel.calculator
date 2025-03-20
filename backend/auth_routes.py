import os
from flask import Blueprint, request, jsonify
from flask_bcrypt import Bcrypt
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity,
    verify_jwt_in_request
)
from flask_cors import cross_origin
from backend.models import db, User
from functools import wraps

bcrypt = Bcrypt()
auth_bp = Blueprint('auth_bp', __name__)

def init_app(app):
    """Inicializar bcrypt con la app Flask."""
    bcrypt.init_app(app)

JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'default_secret_key')

# ✅ Middleware para verificar el token en rutas protegidas
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            verify_jwt_in_request()
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return jsonify({"error": "Token inválido o expirado"}), 403

            current_user = User.query.get(current_user_id)
            if not current_user:
                return jsonify({"error": "Usuario no encontrado"}), 403

            return f(current_user, *args, **kwargs)

        except Exception as e:
            return jsonify({"error": f"Error en autenticación: {str(e)}"}), 403

    return decorated

# ✅ Obtener usuario autenticado
@auth_bp.route("/user", methods=["GET"])
@cross_origin(origins="http://localhost:5173", supports_credentials=True)
@jwt_required()
def get_user():
    """Retorna la información del usuario autenticado."""
    try:
        user_id = get_jwt_identity()
        print(f"🔍 ID de usuario obtenido del JWT: {user_id}")

        if not user_id:
            return jsonify({"error": "Token inválido o expirado"}), 401

        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "Usuario no encontrado"}), 404

        return jsonify({
            "id": user.id,
            "name": user.name,
            "email": user.email
        }), 200

    except Exception as e:
        print(f"🚨 Error en /api/user: {e}")
        return jsonify({"error": "Error al obtener usuario"}), 500

# ✅ Registro de usuario
@auth_bp.route("/register", methods=["POST"])
def register():
    try:
        data = request.get_json()
        name = data.get("name")
        email = data.get("email")
        password = data.get("password")

        if not all([name, email, password]):
            return jsonify({"error": "Todos los campos son obligatorios"}), 400

        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({"error": "El correo ya está registrado"}), 409

        # ✅ Hashear la contraseña correctamente antes de guardarla
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

        new_user = User(name=name, email=email, password=hashed_password)
        db.session.add(new_user)
        db.session.commit()

        # ✅ Generar token JWT
        token = create_access_token(identity=str(new_user.id))

        return jsonify({
            "message": "Usuario registrado con éxito",
            "jwt": token,
            "user": {
                "id": new_user.id,
                "name": new_user.name,
                "email": new_user.email
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Error en registro: {str(e)}"}), 500

# ✅ Inicio de sesión
@auth_bp.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            return jsonify({"error": "Correo y contraseña son requeridos"}), 400

        user = User.query.filter_by(email=email).first()

        if not user or not bcrypt.check_password_hash(user.password, password):
            print("🚨 Credenciales inválidas.")
            return jsonify({"error": "Credenciales inválidas"}), 401

        # ✅ Generar token JWT
        token = create_access_token(identity=str(user.id))
        print(f"✅ Login exitoso para {user.email}")

        return jsonify({
            "message": "Inicio de sesión exitoso",
            "jwt": token,
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email
            }
        }), 200

    except Exception as e:
        return jsonify({"error": f"Error en login: {str(e)}"}), 500

# ✅ Cierre de sesión
@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    """Cerrar sesión (opcionalmente, invalidando el token)."""
    try:
        response = jsonify({"message": "Cierre de sesión exitoso"})
        response.headers.add("Access-Control-Allow-Credentials", "true")
        return response, 200

    except Exception as e:
        return jsonify({"error": f"Error en logout: {str(e)}"}), 500
