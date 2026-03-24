import requests
import random
import math
from typing import List, Dict
from backend.config import GOOGLE_MAPS_API_KEY

# ============================================================
# 🔴 FEATURE FLAGS
# ============================================================
USE_REAL_APIS = False   # 🔥 mantener en False = sin costo
DEBUG_ELEVATION = True  # 🔍 logs de segmentos

MAX_POINTS = 100


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
# 🔹 Simulación realista de elevación
# ============================================================

def generate_realistic_elevation(points):
    """
    Simula elevación tipo terreno real:
    - ruido suave
    - subidas largas
    - bajadas progresivas
    """

    elevation = random.uniform(0, 500)
    elevations = []

    for i in range(len(points)):
        delta = random.uniform(-10, 10)

        # subida progresiva
        if i % 15 == 0:
            delta += random.uniform(20, 50)

        # bajada progresiva
        if i % 25 == 0:
            delta -= random.uniform(20, 50)

        elevation = max(0, elevation + delta)
        elevations.append(elevation)

    return elevations


# ============================================================
# 🔹 Elevation por ruta (segmentado)
# ============================================================

def get_route_elevation_segments(
    polyline: str,
    segment_length_km: float = 1.0
) -> List[Dict]:

    if not polyline:
        raise ValueError("Polyline requerida")

    from backend.services.polyline_service import decode_polyline

    points = decode_polyline(polyline)

    if len(points) < 2:
        return []

    # 🔒 LIMITADOR (anti costos)
    if len(points) > MAX_POINTS:
        step = len(points) // MAX_POINTS
        points = points[::step][:MAX_POINTS]

    # =========================================================
    # 🔴 MODO MOCK REALISTA (SIN COSTO)
    # =========================================================
    if not USE_REAL_APIS:
        print("🧪 MODO MOCK REALISTA ACTIVADO")

        elevations = generate_realistic_elevation(points)
        segments = []

        for i in range(1, len(points)):
            p1 = points[i - 1]
            p2 = points[i]

            d_km = haversine_distance_km(p1, p2)
            if d_km == 0:
                continue

            elev_diff = elevations[i] - elevations[i - 1]

            grade = (elev_diff / (d_km * 1000)) * 100

            # 🔧 limitar valores irreales
            grade = max(min(grade, 12), -12)

            segment = {
                "distance_km": round(d_km, 3),
                "elevation_diff_m": round(elev_diff, 1),
                "grade_percent": round(grade, 2),
                "type": classify_grade(grade)
            }

            # 🔍 DEBUG
            if DEBUG_ELEVATION:
                print(
                    f"📈 Segmento: {segment['distance_km']} km | "
                    f"pendiente: {segment['grade_percent']}% | "
                    f"tipo: {segment['type']}"
                )

            segments.append(segment)

        return segments

    # =========================================================
    # 🌍 MODO REAL (COSTOSO)
    # =========================================================
    print(f"📡 Elevation request con {len(points)} puntos")

    locations = "|".join(
        f"{p['lat']},{p['lng']}" for p in points
    )

    url = "https://maps.googleapis.com/maps/api/elevation/json"
    params = {
        "locations": locations,
        "key": GOOGLE_MAPS_API_KEY,
    }

    try:
        response = requests.get(url, params=params, timeout=5)
        data = response.json()

        if data["status"] != "OK":
            raise Exception(f"Google API error: {data['status']}")

        elevations = [r["elevation"] for r in data["results"]]

    except Exception as e:
        print("❌ ERROR ELEVATION API:", str(e))

        return [{
            "distance_km": 1,
            "elevation_diff_m": 0,
            "grade_percent": 0,
            "type": "flat"
        }]

    # =========================================================
    # 🧭 CONSTRUCCIÓN REAL
    # =========================================================
    segments = []

    acc_distance = 0.0
    acc_elevation = 0.0

    for i in range(1, len(points)):
        d_km = haversine_distance_km(points[i - 1], points[i])
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