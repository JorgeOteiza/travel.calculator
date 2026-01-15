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
    Calcula el consumo ajustado (L/100km) usando penalizaciones aditivas realistas.
    """

    if base_fc <= 0:
        raise ValueError("El consumo base debe ser mayor a 0")

    # ===============================
    # PESO
    # ===============================
    weight_penalty = 0.0
    if extra_weight > 0:
        # +6% cada 100kg
        weight_penalty = (extra_weight / 100) * 0.06
        weight_penalty = min(weight_penalty, 0.35)

    # ===============================
    # PENDIENTE
    # ===============================
    if road_grade > 0:
        grade_penalty = road_grade * 0.05
        grade_penalty = min(grade_penalty, 0.40)
    else:
        grade_penalty = road_grade * 0.02
        grade_penalty = max(grade_penalty, -0.15)

    # ===============================
    # CLIMA
    # ===============================
    CLIMATE_PENALTIES = {
        "normal": 0.00,
        "rain": 0.05,
        "cold": 0.07,
        "hot": 0.04,
        "windy": 0.06,
    }

    climate_penalty = CLIMATE_PENALTIES.get(climate, 0.0)

    # ===============================
    # TIPO DE MOTOR
    # ===============================
    engine_penalty = 0.0
    engine_type = engine_type.lower()

    if "diesel" in engine_type:
        engine_penalty = -0.05
    elif "hybrid" in engine_type:
        engine_penalty = -0.10

    # ===============================
    # PENALIZACIÓN TOTAL
    # ===============================
    total_penalty = (
        weight_penalty
        + grade_penalty
        + climate_penalty
        + engine_penalty
    )

    # límites de seguridad
    total_penalty = max(-0.20, min(total_penalty, 0.60))

    adjusted_fc = base_fc * (1 + total_penalty)

    # ===============================
    # DEBUG
    # ===============================
    if debug:
        return {
            "base_fc": round(base_fc, 3),
            "weight_penalty": round(weight_penalty, 3),
            "grade_penalty": round(grade_penalty, 3),
            "climate_penalty": round(climate_penalty, 3),
            "engine_penalty": round(engine_penalty, 3),
            "total_penalty": round(total_penalty, 3),
            "adjusted_fc": round(adjusted_fc, 3),
        }

    return round(adjusted_fc, 3)
