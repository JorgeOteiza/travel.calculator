import requests
from backend.config import GOOGLE_MAPS_API_KEY


def get_elevation_difference(origin, destination):
    """
    Retorna diferencia de elevación en metros (destino - origen)
    """

    url = "https://maps.googleapis.com/maps/api/elevation/json"

    locations = (
        f"{origin['lat']},{origin['lng']}|"
        f"{destination['lat']},{destination['lng']}"
    )

    params = {
        "locations": locations,
        "key": GOOGLE_MAPS_API_KEY,
    }

    response = requests.get(url, params=params)
    data = response.json()

    if data["status"] != "OK":
        raise Exception("Error al obtener elevación")

    elev_origin = data["results"][0]["elevation"]
    elev_dest = data["results"][1]["elevation"]

    return elev_dest - elev_origin
