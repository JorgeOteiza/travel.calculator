import requests
from backend.config import OPENWEATHER_API_KEY


def get_climate_from_coords(coords):
    """
    Retorna clima normalizado:
    cold | hot | windy | snowy | mild
    """

    lat = coords["lat"]
    lng = coords["lng"]

    url = "https://api.openweathermap.org/data/2.5/weather"

    params = {
        "lat": lat,
        "lon": lng,
        "appid": OPENWEATHER_API_KEY,
        "units": "metric",
    }

    response = requests.get(url, params=params)
    data = response.json()

    temp = data["main"]["temp"]
    wind = data["wind"]["speed"]
    weather_main = data["weather"][0]["main"].lower()

    if "snow" in weather_main:
        return "snowy"
    if temp < 5:
        return "cold"
    if temp > 30:
        return "hot"
    if wind > 10:
        return "windy"

    return "mild"
