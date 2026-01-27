import requests
import math
from typing import List, Dict
from backend.config import GOOGLE_MAPS_API_KEY

# ============================================================
# 🔹 Utilidades geográficas
# ============================================================

def haversine_distance_km(p1: dict, p2: dict) -> float:
    """
    Calcula distancia en km entre dos puntos lat/lng
    """
    R = 6371  # radio tierra km

    lat1, lon1 = math.radians(p1["lat"]), math.radians(p1["lng"])
    lat2, lon2 = math.radians(p2["lat"]), math.radians(p2["lng"])

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    )

    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


# ============================================================
# 🔹 Polyline decoder (Google)
# ============================================================

def decode_polyline(encoded: str) -> List[Dict[str, float]]:
    """
    Decodifica polyline de Google Maps a lista de coordenadas
    """
    coords = []
    index = lat = lng = 0

    while index < len(encoded):
        result = shift = 0
        while True:
            b = ord(encoded[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break

        dlat = ~(result >> 1) if result & 1 else result >> 1
        lat += dlat

        result = shift = 0
        while True:
            b = ord(encoded[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break

        dlng = ~(result >> 1) if result & 1 else result >> 1
        lng += dlng

        coords.append({
            "lat": lat / 1e5,
            "lng": lng / 1e5
        })

    return coords


# ============================================================
# 🔹 Elevation por ruta (segmentado)
# ============================================================

def get_route_elevation_segments(
    polyline: str,
    segment_length_km: float = 1.0
) -> List[Dict]:
    """
    Retorna segmentos de ruta con distancia y pendiente promedio.
    """

    if not polyline:
        raise ValueError("Polyline requerida")

    points = decode_polyline(polyline)

    if len(points) < 2:
        return []

    # --------------------------------------------------------
    # 1️⃣ Obtener elevaciones en batch
    # --------------------------------------------------------
    locations = "|".join(
        f"{p['lat']},{p['lng']}" for p in points
    )

    url = "https://maps.googleapis.com/maps/api/elevation/json"
    params = {
        "locations": locations,
        "key": GOOGLE_MAPS_API_KEY,
    }

    response = requests.get(url, params=params)
    data = response.json()

    if data["status"] != "OK":
        raise Exception("Error al obtener elevación por ruta")

    elevations = [
        r["elevation"] for r in data["results"]
    ]

    # --------------------------------------------------------
    # 2️⃣ Construcción de segmentos
    # --------------------------------------------------------
    segments = []

    acc_distance = 0.0
    acc_elevation = 0.0
    acc_points = 0

    for i in range(1, len(points)):
        d_km = haversine_distance_km(
            points[i - 1],
            points[i]
        )

        delta_elev = elevations[i] - elevations[i - 1]

        acc_distance += d_km
        acc_elevation += delta_elev
        acc_points += 1

        if acc_distance >= segment_length_km:
            grade = (
                (acc_elevation / (acc_distance * 1000)) * 100
                if acc_distance > 0 else 0
            )

            segments.append({
                "distance_km": round(acc_distance, 3),
                "elevation_diff_m": round(acc_elevation, 1),
                "grade_percent": round(grade, 2),
                "type": classify_grade(grade)
            })

            acc_distance = 0.0
            acc_elevation = 0.0
            acc_points = 0

    return segments


# ============================================================
# 🔹 Clasificación de pendiente
# ============================================================

def classify_grade(grade: float) -> str:
    """
    Clasifica pendiente para consumo
    """
    if grade >= 7:
        return "extreme_climb"
    elif grade >= 4:
        return "steep_uphill"
    elif grade >= 1:
        return "uphill"
    elif grade > -1:
        return "flat"
    elif grade > -4:
        return "downhill"
    else:
        return "steep_downhill"
