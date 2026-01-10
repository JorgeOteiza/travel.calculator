import requests
from backend.config import GOOGLE_MAPS_API_KEY


def get_distance_km(origin, destination):
    """
    origin / destination:
    { lat: float, lng: float }
    """

    url = "https://maps.googleapis.com/maps/api/distancematrix/json"

    params = {
        "origins": f"{origin['lat']},{origin['lng']}",
        "destinations": f"{destination['lat']},{destination['lng']}",
        "units": "metric",
        "key": GOOGLE_MAPS_API_KEY,
    }

    response = requests.get(url, params=params)
    data = response.json()

    if data["status"] != "OK":
        raise Exception("Error al calcular distancia")

    meters = data["rows"][0]["elements"][0]["distance"]["value"]
    return meters / 1000
