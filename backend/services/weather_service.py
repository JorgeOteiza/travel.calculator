import requests
from backend.config import OPENWEATHER_API_KEY


def get_weather_from_coords(coords):
    lat = coords["lat"]
    lng = coords["lng"]

    if not OPENWEATHER_API_KEY:
        return {
            "climate": "mild",
            "raw": None,
            "source": "fallback_no_api_key",
        }

    url = "https://api.openweathermap.org/data/2.5/weather"
    params = {
        "lat": lat,
        "lon": lng,
        "appid": OPENWEATHER_API_KEY,
        "units": "metric",
    }

    response = requests.get(url, params=params)
    if response.status_code != 200:
        return {
            "climate": "mild",
            "raw": None,
            "source": f"fallback_status_{response.status_code}",
        }

    data = response.json()

    temp = data["main"]["temp"]
    wind = data["wind"]["speed"]
    condition = data["weather"][0]["main"]

    if "snow" in condition.lower():
        label = "snowy"
    elif temp <= 5:
        label = "cold"
    elif temp >= 30:
        label = "hot"
    elif wind >= 8:
        label = "windy"
    else:
        label = "mild"

    return {
        "climate": label,
        "raw": {
            "temp_celsius": temp,
            "wind_speed_mps": wind,
            "condition": condition,
        },
        "source": "openweathermap",
    }
