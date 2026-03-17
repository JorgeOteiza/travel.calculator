import polyline


def decode_polyline(polyline_str):
    """
    Decodifica una polyline de Google Maps y devuelve
    una lista de coordenadas lat/lng.
    """

    if not polyline_str:
        raise ValueError("Polyline vacía")

    coordinates = polyline.decode(polyline_str)

    points = [
        {"lat": lat, "lng": lng}
        for lat, lng in coordinates
    ]

    return points