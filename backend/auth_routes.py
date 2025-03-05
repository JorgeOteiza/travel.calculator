from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import datetime
import os
from backend.models import db, User
from functools import wraps

auth_bp = Blueprint('auth_bp', __name__)

SECRET_KEY = os.getenv('SECRET_KEY', 'default_secret_key')

# ✅ Middleware para verificar el token en rutas protegidas
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization")

        if not token:
            print("🚨 Token faltante en la solicitud")
            return jsonify({"error": "Token faltante"}), 403

        try:
            print(f"🔍 Token recibido: {token}")  # 👈 Debugging
            token = token.split(" ")[1] if " " in token else token  # Evitar errores si no hay 'Bearer'

            decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            current_user = User.query.get(decoded['user_id'])

            if not current_user:
                print("🚨 Usuario no encontrado en la base de datos")
                return jsonify({"error": "Usuario no encontrado"}), 403

        except jwt.ExpiredSignatureError:
            print("🚨 Token expirado")
            return jsonify({"error": "Token expirado"}), 403
        except jwt.InvalidTokenError:
            print("🚨 Token inválido")
            return jsonify({"error": "Token inválido"}), 403
        except Exception as e:
            print(f"🚨 Error desconocido en token: {e}")
            return jsonify({"error": "Error desconocido en token"}), 403

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

    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"error": "El correo ya está registrado"}), 409

    hashed_password = generate_password_hash(password)
    new_user = User(name=name, email=email, password_hash=hashed_password)
    
    db.session.add(new_user)
    db.session.commit()

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

    token = jwt.encode(
        {"user_id": user.id, "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=2)},
        SECRET_KEY,
        algorithm="HS256"
    )

    return jsonify({
        "jwt": token,
        "user": {"id": user.id, "name": user.name, "email": user.email}
    }), 200

# ✅ Obtener usuario autenticado
@auth_bp.route('/api/user', methods=['GET'])
@token_required
def get_user(current_user):
    print(f"✅ Usuario autenticado correctamente: {current_user.name}")  # 👈 Agregado para debugging
    return jsonify({
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email
    })

