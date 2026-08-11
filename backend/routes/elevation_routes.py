from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
import requests
import os
from backend.config import PAID_GOOGLE_APIS_ENABLED

elevation_bp = Blueprint("elevation_bp", __name__)

@elevation_bp.route("/elevation", methods=["GET"])
@cross_origin()
def get_elevation():
    if not PAID_GOOGLE_APIS_ENABLED:
        return jsonify({
            "error": "Google Elevation está desactivado; se utiliza Open-Meteo en el cálculo."
        }), 403

    origin = request.args.get("origin")
    destination = request.args.get("destination")
    api_key = os.getenv("VITE_GOOGLE_MAPS_API_KEY")

    if not origin or not destination:
        return jsonify({"error": "Faltan parámetros 'origin' y 'destination'"}), 400
    if not api_key:
        return jsonify({"error": "API Key de Google no configurada"}), 500

    try:
        url = (
            "https://maps.googleapis.com/maps/api/elevation/json"
            f"?locations={origin}|{destination}&key={api_key}"
        )
        response = requests.get(url)
        data = response.json()

        if data["status"] != "OK":
            return jsonify({"error": "Error en Google Elevation API"}), 500

        return jsonify(data), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
