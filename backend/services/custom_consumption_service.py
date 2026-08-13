ROAD_REFERENCE_FACTORS = {
    "city": 1.16,
    "mixed": 1.05,
    "highway": 0.90,
    "rural": 0.97,
}


def adapt_user_consumption(
    *,
    consumption_kml: float,
    reference_profile: str,
    target_profile: str,
    distance_km: float,
) -> dict:
    """Adapta un rendimiento observado al contexto de la ruta.

    El dato del usuario se conserva en su contexto de origen. Para trasladarlo
    a otra vía se normaliza por factores relativos, evitando penalizar dos veces.
    """
    if consumption_kml <= 0:
        raise ValueError("El rendimiento debe ser mayor a cero")
    if reference_profile not in ROAD_REFERENCE_FACTORS:
        raise ValueError("Contexto de rendimiento inválido")
    if target_profile not in ROAD_REFERENCE_FACTORS:
        raise ValueError("Tipo de vía inválido")

    target_factor = ROAD_REFERENCE_FACTORS[target_profile]
    if target_profile == "highway" and distance_km >= 40:
        target_factor = 0.84

    reference_factor = ROAD_REFERENCE_FACTORS[reference_profile]
    context_factor = target_factor / reference_factor
    observed_l100km = 100 / consumption_kml
    adapted_l100km = observed_l100km * context_factor

    return {
        "base_l100km": round(adapted_l100km, 4),
        "adapted_kml": round(100 / adapted_l100km, 3),
        "context_factor": round(context_factor, 3),
        "reference_profile": reference_profile,
        "target_profile": target_profile,
        "long_highway": target_profile == "highway" and distance_km >= 40,
    }
