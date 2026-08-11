import requests
from backend.config import (
    ELEVATION_PROVIDER,
    GOOGLE_MAPS_API_KEY,
    PAID_GOOGLE_APIS_ENABLED,
)


def reduce_points(points, max_points=100):
    if len(points) <= max_points:
        return points
    step = len(points) / max_points
    return [points[int(index * step)] for index in range(max_points)]


def _get_open_meteo_elevations(points):
    response = requests.get(
        "https://api.open-meteo.com/v1/elevation",
        params={
            "latitude": ",".join(str(point["lat"]) for point in points),
            "longitude": ",".join(str(point["lng"]) for point in points),
        },
        timeout=8,
    )
    response.raise_for_status()
    elevations = response.json().get("elevation", [])
    if len(elevations) != len(points):
        raise ValueError("Open-Meteo devolvió un perfil incompleto")
    return [float(value) for value in elevations]


def _get_google_elevations(points):
    if not PAID_GOOGLE_APIS_ENABLED:
        raise RuntimeError("Google Elevation está bloqueado por configuración")
    response = requests.get(
        "https://maps.googleapis.com/maps/api/elevation/json",
        params={
            "locations": "|".join(f'{p["lat"]},{p["lng"]}' for p in points),
            "key": GOOGLE_MAPS_API_KEY,
        },
        timeout=8,
    )
    response.raise_for_status()
    data = response.json()
    if data.get("status") != "OK":
        raise ValueError("Google Elevation no devolvió un resultado válido")
    return [float(result["elevation"]) for result in data["results"]]


def get_elevation_for_points(points):
    """Una única solicitud por cálculo; Open-Meteo es el proveedor por defecto."""
    if not points:
        return []
    limited_points = reduce_points(points, max_points=100)
    if ELEVATION_PROVIDER == "google":
        return _get_google_elevations(limited_points)
    if ELEVATION_PROVIDER != "open_meteo":
        raise ValueError(f"Proveedor de elevación desconocido: {ELEVATION_PROVIDER}")
    return _get_open_meteo_elevations(limited_points)
