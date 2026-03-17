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

            # distancia aproximada en km (Haversine simplificado)
            dx = curr["lat"] - prev["lat"]
            dy = curr["lng"] - prev["lng"]

            segment_distance = ((dx**2 + dy**2) ** 0.5) * 111
            total_distance += segment_distance

        profile.append({
            "distance": round(total_distance, 3),
            "elevation": round(elevations[i], 2)
        })

    return profile