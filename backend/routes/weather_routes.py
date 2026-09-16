import logging
from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from backend.services.weather_service import get_weather_from_coords

logger = logging.getLogger("travelcalculator")

weather_bp = Blueprint("weather_bp", __name__)


@weather_bp.route("/weather", methods=["GET"])
@cross_origin()
def get_weather():
    lat = request.args.get("lat")
    lng = request.args.get("lng")

    if not lat or not lng:
        return jsonify({"error": "Faltan parámetros de latitud o longitud"}), 400

    try:
        weather_data = get_weather_from_coords({
            "lat": float(lat),
            "lng": float(lng),
        })

        return jsonify(weather_data), 200

    except Exception:
        logger.exception("Error obteniendo clima")
        return jsonify({
            "climate": "mild",
            "raw": None,
            "source": "fallback_due_to_exception",
        }), 200
