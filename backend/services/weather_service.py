import requests


def _classify_weather(current):
    temperature = float(current.get("temperature_2m", 18))
    wind = float(current.get("wind_speed_10m", 0))
    rain = float(current.get("rain", 0)) + float(current.get("precipitation", 0))
    snowfall = float(current.get("snowfall", 0))

    if snowfall > 0:
        return "snowy"
    if rain > 0:
        return "rain"
    if temperature <= 5:
        return "cold"
    if temperature >= 30:
        return "hot"
    if wind >= 8:
        return "windy"
    return "mild"


def get_weather_from_coords(coords):
    """Clima actual con Open-Meteo, sin API key ni facturación por consumo."""
    try:
        response = requests.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": coords["lat"],
                "longitude": coords["lng"],
                "current": "temperature_2m,precipitation,rain,snowfall,wind_speed_10m",
                "wind_speed_unit": "ms",
            },
            timeout=6,
        )
        response.raise_for_status()
        current = response.json().get("current", {})
        return {
            "climate": _classify_weather(current),
            "raw": current,
            "source": "open_meteo",
        }
    except Exception as error:
        return {
            "climate": "normal",
            "raw": None,
            "source": "fallback_due_to_exception",
            "error": str(error),
        }
