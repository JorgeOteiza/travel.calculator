from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
import requests
import os
from dotenv import load_dotenv

load_dotenv()

distance_bp = Blueprint("distance_bp", __name__)

@distance_bp.route("/distance", methods=["GET"])
@cross_origin()
def get_distance():
    """
    Calcula la distancia en kilómetros entre dos coordenadas usando Google Distance Matrix API,
    y retorna además la polilínea de la ruta mediante Google Directions API.
    """
    origin = request.args.get("origin")
    destination = request.args.get("destination")

    if not origin or not destination:
        return jsonify({"error": "Parámetros 'origin' y 'destination' son requeridos"}), 400

    try:
        GOOGLE_API_KEY = os.getenv("VITE_GOOGLE_MAPS_API_KEY")
        if not GOOGLE_API_KEY:
            return jsonify({"error": "Falta la clave de API de Google Maps"}), 500

        # 📏 Obtener distancia con Distance Matrix API
        distance_url = (
            "https://maps.googleapis.com/maps/api/distancematrix/json"
            f"?units=metric&origins={origin}&destinations={destination}&key={GOOGLE_API_KEY}"
        )
        distance_response = requests.get(distance_url)
        distance_data = distance_response.json()

        if distance_data["status"] != "OK" or distance_data["rows"][0]["elements"][0]["status"] != "OK":
            return jsonify({"error": "Error en Google Distance Matrix API"}), 500

        distance_meters = distance_data["rows"][0]["elements"][0]["distance"]["value"]
        distance_km = distance_meters / 1000.0

        directions_url = (
            "https://maps.googleapis.com/maps/api/directions/json"
            f"?origin={origin}&destination={destination}&key={GOOGLE_API_KEY}"
        )
        directions_response = requests.get(directions_url)
        directions_data = directions_response.json()

        if directions_data["status"] != "OK":
            return jsonify({"error": "Error en Google Directions API"}), 500

        route_polyline = directions_data["routes"][0]["overview_polyline"]["points"]

        return jsonify({
            "distance_km": distance_km,
            "route_polyline": route_polyline
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
