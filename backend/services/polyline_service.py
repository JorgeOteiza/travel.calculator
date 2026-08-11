import polyline


def decode_polyline(polyline_str):
    """
    Decodifica una polyline de Google Maps y devuelve
    una lista de coordenadas lat/lng.
    """

    if not polyline_str:
        raise ValueError("Polyline vacía")

    coordinates = polyline.decode(polyline_str)

    return [
        {"lat": lat, "lng": lng}
        for lat, lng in coordinates
    ]


def reduce_points(points, max_points=100):
    """
    Reduce la cantidad de puntos para cumplir límites de APIs externas.
    """

    if not points:
        return []

    if len(points) <= max_points:
        return points

    step = max(1, len(points) // max_points)

    reduced = [points[i] for i in range(0, len(points), step)]

    return reduced[:max_points]