# backend/routes/user_routes.py
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_cors import cross_origin
from backend.models import User

user_bp = Blueprint("user_bp", __name__)

@user_bp.route("/user", methods=["GET"])
@cross_origin(supports_credentials=True)
@jwt_required()
def get_user():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            return jsonify({"error": "Usuario no encontrado"}), 404

        return jsonify({
            "id": user.id,
            "name": user.name,
            "email": user.email
        }), 200

    except Exception as e:
        return jsonify({"error": f"Error al obtener usuario: {str(e)}"}), 500
