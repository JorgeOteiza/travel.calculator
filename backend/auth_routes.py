import jwt
import datetime
import os
from flask import Blueprint, request, jsonify
from flask_bcrypt import Bcrypt
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from flask_cors import cross_origin
from werkzeug.security import generate_password_hash, check_password_hash
from backend.models import db, User
from functools import wraps

bcrypt = Bcrypt()
auth_bp = Blueprint('auth_bp', __name__)

SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'default_secret_key')

# ✅ Middleware para verificar el token en rutas protegidas
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization")

        if not token:
            return jsonify({"error": "Token faltante"}), 403

        try:
            if "Bearer " in token:
                token = token.split(" ")[1]  

            decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            current_user = User.query.get(decoded['user_id'])

            if not current_user:
                return jsonify({"error": "Usuario no encontrado"}), 403

        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expirado"}), 403
        except jwt.InvalidTokenError:
            return jsonify({"error": "Token inválido"}), 403
        except Exception as e:
            return jsonify({"error": f"Error en token: {str(e)}"}), 403

        return f(current_user, *args, **kwargs)
    return decorated


@auth_bp.route("/register", methods=["POST"])
@cross_origin(origins="http://localhost:5173", supports_credentials=True)
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

        # ✅ Encriptar contraseña
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        new_user = User(name=name, email=email, password=hashed_password)
        db.session.add(new_user)
        db.session.commit()

        # ✅ Generar token JWT
        token = create_access_token(identity=new_user.id)

        response = jsonify({
            "message": "Usuario registrado con éxito",
            "jwt": token,
            "user": {
                "id": new_user.id,
                "name": new_user.name,
                "email": new_user.email
            }
        })
        response.headers.add("Access-Control-Allow-Credentials", "true")

        return response, 201

    except Exception as e:
        return jsonify({"error": f"Error en registro: {str(e)}"}), 500


@auth_bp.route("/login", methods=["POST"])
@cross_origin()
def login():
    try:
        data = request.get_json()
        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            return jsonify({"error": "Correo y contraseña son requeridos"}), 400

        user = User.query.filter_by(email=email).first()

        if not user or not check_password_hash(user.password, password):  
            return jsonify({"error": "Credenciales inválidas"}), 401

        token = create_access_token(identity=user.id)

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


@auth_bp.route("/user", methods=["GET"])
@cross_origin(origins="http://localhost:5173", supports_credentials=True)
@jwt_required()
def get_user():
    """Retorna la información del usuario autenticado."""
    try:
        user_id = get_jwt_identity()

        if not isinstance(user_id, int):
            return jsonify({"error": "Identidad de usuario inválida"}), 400

        user = User.query.get(user_id)

        if not user:
            return jsonify({"error": "Usuario no encontrado"}), 404

        response = jsonify({
            "id": user.id,
            "name": user.name,
            "email": user.email
        })
        response.headers.add("Access-Control-Allow-Credentials", "true")

        return response, 200

    except Exception as e:
        print(f"🚨 Error en /api/user: {e}")
        return jsonify({"error": "Error al obtener usuario"}), 500