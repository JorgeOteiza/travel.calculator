import math


def haversine_distance(coord1, coord2):
    """
    Calcula la distancia entre dos coordenadas GPS en km.
    """

    R = 6371  # radio de la tierra en km

    lat1 = math.radians(coord1["lat"])
    lon1 = math.radians(coord1["lng"])
    lat2 = math.radians(coord2["lat"])
    lon2 = math.radians(coord2["lng"])

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    )

    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


def create_route_segments(points):
    """
    Convierte una lista de puntos GPS en segmentos de ruta.
    """

    segments = []

    for i in range(len(points) - 1):

        start = points[i]
        end = points[i + 1]

        distance = haversine_distance(start, end)

        segments.append(
            {
                "start": start,
                "end": end,
                "distance": distance,
            }
        )

    return segments