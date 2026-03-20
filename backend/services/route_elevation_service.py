import requests
import math
from typing import List, Dict
from backend.config import GOOGLE_MAPS_API_KEY

from backend.services.polyline_service import decode_polyline, reduce_points

# ============================================================
# 🔹 Utilidades geográficas
# ============================================================

def haversine_distance_km(p1: dict, p2: dict) -> float:
    R = 6371

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
# 🔹 Elevation por ruta (segmentado)
# ============================================================

def get_route_elevation_segments(
    polyline: str,
    segment_length_km: float = 1.0
) -> List[Dict]:

    if not polyline:
        raise ValueError("Polyline requerida")

    points = decode_polyline(polyline)

    # 🔥 FIX CRÍTICO: reducir puntos (evita error 500 por URL gigante)
    points = reduce_points(points, max_points=100)

    if len(points) < 2:
        return []

    # --------------------------------------------------------
    # 1️⃣ Obtener elevaciones
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

    if response.status_code != 200:
        raise Exception("Error HTTP en Elevation API")

    data = response.json()

    if data.get("status") != "OK":
        raise Exception(f"Error Elevation API: {data}")

    elevations = [
        r["elevation"] for r in data["results"]
    ]

    # --------------------------------------------------------
    # 2️⃣ Construcción de segmentos
    # --------------------------------------------------------
    segments = []

    acc_distance = 0.0
    acc_elevation = 0.0

    for i in range(1, len(points)):
        d_km = haversine_distance_km(
            points[i - 1],
            points[i]
        )

        delta_elev = elevations[i] - elevations[i - 1]

        acc_distance += d_km
        acc_elevation += delta_elev

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

    return segments


# ============================================================
# 🔹 Clasificación de pendiente
# ============================================================

def classify_grade(grade: float) -> str:
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