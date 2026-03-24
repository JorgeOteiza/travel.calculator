import requests
from backend.config import GOOGLE_MAPS_API_KEY


def reduce_points(points, max_points=120):
    """
    Reduce la cantidad de puntos de una ruta manteniendo
    una distribución uniforme.
    """

    if len(points) <= max_points:
        return points

    step = len(points) / max_points
    reduced = []

    for i in range(max_points):
        index = int(i * step)
        reduced.append(points[index])

    return reduced


def get_elevation_for_points(points):
    """
    Obtiene elevación para una lista de puntos usando Google Elevation API
    """

    if not points:
        return []

    locations = "|".join(
        f"{p['lat']},{p['lng']}" for p in points
    )

    url = "https://maps.googleapis.com/maps/api/elevation/json"

    params = {
        "locations": locations,
        "key": GOOGLE_MAPS_API_KEY,
    }

    response = requests.get(url, params=params, timeout=5)
    data = response.json()

    if data["status"] != "OK":
        raise Exception("Error obteniendo elevación")

    elevations = [result["elevation"] for result in data["results"]]

    return elevations


def calculate_segment_grades(segments, elevations):
    """
    Calcula la pendiente (%) de cada segmento usando elevación.
    """

    for i, segment in enumerate(segments):

        elev_start = elevations[i]
        elev_end = elevations[i + 1]

        elevation_diff = elev_end - elev_start

        distance_m = segment["distance"] * 1000

        if distance_m == 0:
            grade = 0
        else:
            grade = (elevation_diff / distance_m) * 100

        segment["grade"] = grade

    return segments