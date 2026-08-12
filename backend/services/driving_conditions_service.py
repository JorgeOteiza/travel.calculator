from datetime import datetime


def calculate_operating_conditions(
    *,
    distance_km: float,
    road_profile: str,
    departure_time: datetime | None = None,
    departure_hour: int | None = None,
    driving_style: str = "moderate",
) -> dict:
    """Modela arranque en frío y congestión horaria sin una API pagada."""
    if departure_hour is not None and not 0 <= departure_hour <= 23:
        raise ValueError("La hora local debe estar entre 0 y 23")
    local_hour = (
        departure_hour
        if departure_hour is not None
        else (departure_time or datetime.now()).hour
    )
    profile = (road_profile or "mixed").lower()
    style = (driving_style or "moderate").lower()
    style_factors = {"calm": 0.96, "moderate": 1.0, "hurried": 1.12}
    if style not in style_factors:
        raise ValueError("Estilo de conducción inválido")
    driving_style_factor = style_factors[style]

    short_trip_factor = 1.0
    if distance_km < 15:
        remaining_share = max(0.0, min(1.0, (15 - distance_km) / 12))
        short_trip_factor += 0.20 * remaining_share

    traffic_factor = 1.0
    traffic_level = "fluido"
    if profile == "city":
        if 17 <= local_hour < 21:
            traffic_factor = 1.22
            traffic_level = "hora punta"
        elif 7 <= local_hour < 10 or 12 <= local_hour < 17 or 21 <= local_hour < 23:
            traffic_factor = 1.10
            traffic_level = "moderado"
    elif profile == "mixed":
        if 17 <= local_hour < 21:
            traffic_factor = 1.10
            traffic_level = "hora punta"
        elif 7 <= local_hour < 10:
            traffic_factor = 1.05
            traffic_level = "moderado"

    return {
        "departure_hour": local_hour,
        "traffic_level": traffic_level,
        "traffic_factor": round(traffic_factor, 3),
        "short_trip_factor": round(short_trip_factor, 3),
        "driving_style": style,
        "driving_style_factor": driving_style_factor,
        "operating_factor": round(short_trip_factor * traffic_factor * driving_style_factor, 3),
        "is_short_trip": distance_km < 15,
        "method": "heurística local; no usa tráfico en tiempo real",
    }
