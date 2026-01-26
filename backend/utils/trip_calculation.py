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
    Calcula el consumo ajustado (L/100km) combinando:
    - Régimen de conducción
    - Esfuerzo por pendiente
    - Terreno
    - Peso
    - Clima
    Permite valores altos cuando la física lo justifica.
    """

    if base_fc <= 0:
        raise ValueError("El consumo base debe ser mayor a 0")

    debug_data = {}

    # =====================================================
    # 1. RÉGIMEN DE CONDUCCIÓN (AFECTA BASE)
    # =====================================================
    driving_mode = "normal"
    regime_multiplier = 1.0

    if road_grade >= 7 and distance_km <= 30:
        # Colliguay, Farellones, Cajón del Maipo
        driving_mode = "extreme_climb"
        regime_multiplier = 1.28

    elif 3 <= road_grade < 7 and distance_km >= 40:
        # Ruta 5 Sur, Camino de la Fruta
        driving_mode = "sustained_climb"
        regime_multiplier = 1.10

    adjusted_base_fc = base_fc * regime_multiplier

    debug_data.update({
        "driving_mode": driving_mode,
        "regime_multiplier": round(regime_multiplier, 3),
        "adjusted_base_fc": round(adjusted_base_fc, 3),
    })

    # =====================================================
    # 2. PESO
    # =====================================================
    weight_penalty = 0.0
    if extra_weight > 0:
        weight_penalty = (extra_weight / 100) * 0.06

    # =====================================================
    # 3. PENDIENTE (ESFUERZO PURO)
    # =====================================================
    if road_grade > 0:
        grade_penalty = road_grade * 0.06
    else:
        grade_penalty = road_grade * 0.02
        grade_penalty = max(grade_penalty, -0.15)

    # =====================================================
    # 4. TERRENO
    # =====================================================
    terrain_penalty = 0.0
    terrain_type = "flat"

    if road_grade >= 6 and distance_km < 40:
        terrain_type = "extreme_mountain"
        terrain_penalty = 0.22

    elif 2 <= road_grade < 6 and distance_km >= 40:
        terrain_type = "rolling_hills"
        terrain_penalty = 0.10

    elif abs(road_grade) < 2 and distance_km < 60:
        terrain_type = "urban_hills"
        terrain_penalty = 0.08

    debug_data["terrain_type"] = terrain_type

    # =====================================================
    # 5. CLIMA
    # =====================================================
    CLIMATE_PENALTIES = {
        "normal": 0.00,
        "rain": 0.05,
        "cold": 0.07,
        "hot": 0.04,
        "windy": 0.06,
        "mild": 0.03,
    }

    climate_penalty = CLIMATE_PENALTIES.get(climate, 0.0)

    # =====================================================
    # 6. MOTOR
    # =====================================================
    engine_penalty = 0.0
    engine_type = engine_type.lower()

    if "diesel" in engine_type:
        engine_penalty = -0.06
    elif "hybrid" in engine_type:
        engine_penalty = -0.12

    # =====================================================
    # 7. PENALIZACIÓN TOTAL
    # =====================================================
    total_penalty = (
        weight_penalty
        + grade_penalty
        + terrain_penalty
        + climate_penalty
        + engine_penalty
    )

    total_penalty = max(total_penalty, -0.25)

    adjusted_fc = adjusted_base_fc * (1 + total_penalty)

    # =====================================================
    # 8. DEBUG
    # =====================================================
    if debug:
        debug_data.update({
            "base_fc": round(base_fc, 3),
            "weight_penalty": round(weight_penalty, 3),
            "grade_penalty": round(grade_penalty, 3),
            "terrain_penalty": round(terrain_penalty, 3),
            "climate_penalty": round(climate_penalty, 3),
            "engine_penalty": round(engine_penalty, 3),
            "total_penalty": round(total_penalty, 3),
            "final_fc": round(adjusted_fc, 3),
        })
        return debug_data

    return round(adjusted_fc, 3)
