import logging
import math
from backend.services.polyline_service import decode_polyline

logger = logging.getLogger("travelcalculator")

# ============================================================
# 🔹 Haversine (distancia en línea recta)
# ============================================================

def haversine_distance_km(p1, p2):
    R = 6371  # radio tierra km

    lat1 = math.radians(p1["lat"])
    lon1 = math.radians(p1["lng"])
    lat2 = math.radians(p2["lat"])
    lon2 = math.radians(p2["lng"])

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2)
        * math.sin(dlon / 2) ** 2
    )

    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


# ============================================================
# 🔹 Distancia basada en polyline (ruta real)
# ============================================================

def calculate_polyline_distance(polyline: str) -> float:
    points = decode_polyline(polyline)

    if not points or len(points) < 2:
        return 0

    # 🔒 OPTIMIZACIÓN ANTI-COSTO / PERFORMANCE
    if len(points) > 500:
        logger.debug("Polyline muy grande (%d puntos), reduciendo...", len(points))
        points = points[::5]

    total_distance = 0.0

    for i in range(1, len(points)):
        total_distance += haversine_distance_km(
            points[i - 1],
            points[i]
        )

    return total_distance


# ============================================================
# 🔹 API PRINCIPAL (lo que usa tu backend)
# ============================================================

def get_distance_km(origin, destination, polyline=None):
    """
    Estrategia:
    - Si hay polyline → distancia real de ruta
    - Si falla → fallback a línea recta
    """

    # 🟢 CASO IDEAL (tu flujo actual)
    if polyline:
        try:
            distance = calculate_polyline_distance(polyline)

            if distance > 0:
                logger.debug("Distancia calculada desde polyline (precisa)")
                return distance

            logger.debug("Polyline inválida, usando fallback")

        except Exception:
            logger.exception("Error calculando distancia por polyline")

    # 🟡 FALLBACK (seguro)
    if origin and destination:
        logger.debug("Fallback Haversine (línea recta)")
        return haversine_distance_km(origin, destination)

    # 🔴 ERROR TOTAL
    raise Exception("Error al calcular distancia")