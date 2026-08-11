from backend.services.distance_service import haversine_distance_km


def build_elevation_profile(points, elevations):
    """
    Construye el perfil de elevación acumulado de la ruta.
    Devuelve distancia acumulada vs elevación.
    """

    if not points or not elevations:
        return []

    profile = []
    total_distance = 0

    for i in range(len(points)):

        if i > 0:
            prev = points[i - 1]
            curr = points[i]

            segment_distance = haversine_distance_km(prev, curr)
            total_distance += segment_distance

        profile.append({
            "distance": round(total_distance, 3),
            "elevation": round(elevations[i], 2)
        })

    return profile


def build_elevation_segments(points, elevations):
    """Construye segmentos deterministas con distancia y pendiente real."""
    if len(points) < 2 or len(points) != len(elevations):
        return []

    segments = []
    for index in range(1, len(points)):
        distance_km = haversine_distance_km(points[index - 1], points[index])
        if distance_km <= 0:
            continue
        elevation_difference = elevations[index] - elevations[index - 1]
        grade = (elevation_difference / (distance_km * 1000)) * 100
        segments.append({
            "distance_km": round(distance_km, 4),
            "elevation_diff_m": round(elevation_difference, 2),
            "grade_percent": round(max(-15, min(grade, 15)), 3),
        })
    return segments
