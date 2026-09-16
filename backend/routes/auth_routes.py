from datetime import UTC, datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, jwt_required, get_jwt_identity, get_jwt
)
from backend.models import db, User, RevokedToken
from backend.extensions import bcrypt, limiter
from functools import wraps

auth_bp = Blueprint('auth_bp', __name__)

# Decorador para verificar roles
def role_required(role):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            user_id = get_jwt_identity()
            user = User.query.get(user_id)
            if not user or not user.has_role(role):
                return jsonify({"error": "Acceso denegado"}), 403
            return func(*args, **kwargs)
        return wrapper
    return decorator


@auth_bp.route("/user", methods=["GET"])
@jwt_required()
def get_user():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "Usuario no encontrado"}), 404

    return jsonify({
        "id": user.id,
        "name": user.name,
        "email": user.email
    }), 200


@auth_bp.route("/register", methods=["POST"])
@limiter.limit("5 per minute")
def register():
    try:
        data = request.get_json(silent=True) or {}
        name = data.get("name")
        email = data.get("email")
        password = data.get("password")

        if not all([name, email, password]):
            return jsonify({"error": "Todos los campos son obligatorios"}), 400

        if User.query.filter_by(email=email).first():
            return jsonify({"error": "El correo ya está registrado"}), 409

        new_user = User(name=name, email=email, password=password)
        db.session.add(new_user)
        db.session.commit()

        token = create_access_token(
            identity=str(new_user.id),
            additional_claims={"ver": new_user.session_version},
        )

        return jsonify({
            "message": "Usuario registrado con éxito",
            "jwt": token,
            "user": {
                "id": new_user.id,
                "name": new_user.name,
                "email": new_user.email
            }
        }), 201

    except Exception:
        db.session.rollback()
        raise


@auth_bp.route("/login", methods=["POST"])
@limiter.limit("5 per minute")
def login():
    data = request.get_json(silent=True) or {}
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Correo y contraseña son requeridos"}), 400

    user = User.query.filter_by(email=email).first()

    if not user or not bcrypt.check_password_hash(user.password, password):
        return jsonify({"error": "Credenciales inválidas"}), 401

    token = create_access_token(
        identity=str(user.id),
        additional_claims={"ver": user.session_version},
    )

    return jsonify({
        "message": "Inicio de sesión exitoso",
        "jwt": token,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email
        }
    }), 200


@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    try:
        user_id = get_jwt_identity()
        claims = get_jwt()

        db.session.add(RevokedToken(
            jti=claims["jti"],
            token_type=claims["type"],
            user_id=user_id,
            expires_at=datetime.fromtimestamp(claims["exp"], tz=UTC).replace(tzinfo=None),
        ))

        user = User.query.get(user_id)
        if user:
            user.session_version += 1

        db.session.commit()

        return jsonify({"message": "Cierre de sesión exitoso"}), 200
    except Exception:
        db.session.rollback()
        raise


@auth_bp.route("/admin", methods=["GET"])
@jwt_required()
@role_required("admin")
def admin_dashboard():
    return jsonify({"message": "Bienvenido al panel de administrador"}), 200
