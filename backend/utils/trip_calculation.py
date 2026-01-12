def calculate_fuel_consumption(
    base_fc: float,
    vehicle_weight: float,
    extra_weight: float,
    road_grade: float,
    climate: str,
    distance_km: float,
    engine_type: str = "gasoline",
    debug: bool = False,
):
    """
    Calcula el consumo ajustado (L/100km) basado en:
    - peso total
    - pendiente del camino
    - clima
    """

    # ===============================
    # VALIDACIONES BÁSICAS
    # ===============================
    if base_fc <= 0:
        raise ValueError("El consumo base debe ser mayor a 0")

    total_weight = vehicle_weight + extra_weight

    # ===============================
    # FACTOR PESO
    # ===============================
    # +12% cada 200kg extra
    weight_diff = max(0, total_weight - vehicle_weight)
    weight_factor = 1 + (weight_diff / 200) * 0.12
    weight_factor = max(0.9, min(weight_factor, 1.6))

    # ===============================
    # FACTOR PENDIENTE
    # ===============================
    if road_grade > 0:
        grade_factor = 1 + (road_grade * 0.04)
    else:
        grade_factor = 1 + (road_grade * 0.015)

    grade_factor = max(0.85, min(grade_factor, 1.5))

    # ===============================
    # FACTOR CLIMA
    # ===============================
    CLIMATE_FACTORS = {
        "normal": 1.00,
        "rain": 1.05,
        "cold": 1.08,
        "hot": 1.04,
        "windy": 1.06,
    }

    climate_factor = CLIMATE_FACTORS.get(climate, 1.0)

    # ===============================
    # CONSUMO FINAL
    # ===============================
    adjusted_fc = (
        base_fc
        * weight_factor
        * grade_factor
        * climate_factor
    )

    # ===============================
    # DEBUG (OPCIONAL)
    # ===============================
    if debug:
        return {
            "base_fc": round(base_fc, 3),
            "weight_factor": round(weight_factor, 3),
            "grade_factor": round(grade_factor, 3),
            "climate_factor": round(climate_factor, 3),
            "adjusted_fc": round(adjusted_fc, 3),
        }

    return adjusted_fc
