from flask import Blueprint, request, jsonify
from flask_cors import cross_origin

weather_bp = Blueprint("weather_bp", __name__)

@weather_bp.route("/weather", methods=["GET"])
@cross_origin()
def get_weather():
    lat = request.args.get("lat")
    lng = request.args.get("lng")

    if not lat or not lng:
        return jsonify({"error": "Faltan parámetros de latitud o longitud"}), 400

    simulated_weather = {
        "climate": "mild"
    }
    return jsonify(simulated_weather), 200
