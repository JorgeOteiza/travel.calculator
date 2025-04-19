import os
import requests
from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from dotenv import load_dotenv

load_dotenv()

weather_bp = Blueprint("weather_bp", __name__)
OPENWEATHERMAP_API_KEY = os.getenv("VITE_OPENWEATHERMAP_API_KEY")

def map_weather_condition(temp_celsius, wind_speed, condition_main):
    """
    Traduce los datos climáticos de OpenWeatherMap a etiquetas comprensibles para el cálculo.
    """
    if condition_main.lower() in ["snow", "blizzard"]:
        return "snowy"
    if temp_celsius <= 5:
        return "cold"
    elif temp_celsius >= 30:
        return "hot"
    elif wind_speed >= 8:
        return "windy"
    else:
        return "mild"

@weather_bp.route("/weather", methods=["GET"])
@cross_origin()
def get_weather():
    lat = request.args.get("lat")
    lng = request.args.get("lng")

    if not lat or not lng:
        return jsonify({"error": "Faltan parámetros de latitud o longitud"}), 400

    if not OPENWEATHERMAP_API_KEY:
        return jsonify({"error": "Falta la API KEY de OpenWeatherMap"}), 500

    try:
        url = (
            f"https://api.openweathermap.org/data/2.5/weather?"
            f"lat={lat}&lon={lng}&appid={OPENWEATHERMAP_API_KEY}&units=metric"
        )
        response = requests.get(url)
        if response.status_code != 200:
            return jsonify({"error": f"Error en OpenWeatherMap: {response.status_code}"}), 500

        data = response.json()
        temp = data["main"]["temp"]
        wind_speed = data["wind"]["speed"]
        condition_main = data["weather"][0]["main"]

        label = map_weather_condition(temp, wind_speed, condition_main)

        return jsonify({
            "climate": label,
            "raw": {
                "temp_celsius": temp,
                "wind_speed_mps": wind_speed,
                "condition": condition_main
            }
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
