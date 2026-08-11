def calculate_fuel_consumption(
    base_fc: float,
    vehicle_weight: float,
    extra_weight: float,
    road_grade: float,
    climate: str,
    distance_km: float,
    engine_type: str = "gasoline",
    road_profile: str = "mixed",
):
    if base_fc <= 0:
        raise ValueError("El consumo base debe ser mayor a 0")

    # =========================
    # 1. REGIMEN
    # =========================
    regime_multiplier = 1.0

    if road_grade >= 7 and distance_km <= 30:
        regime_multiplier = 1.28
    elif 3 <= road_grade < 7 and distance_km >= 40:
        regime_multiplier = 1.10

    adjusted_base_fc = base_fc * regime_multiplier

    # =========================
    # 2. PESO
    # =========================
    weight_penalty = (extra_weight / 100) * 0.06 if extra_weight > 0 else 0

    # =========================
    # 3. PENDIENTE
    # =========================
    if road_grade > 0:
        grade_penalty = road_grade * 0.06
    else:
        grade_penalty = max(road_grade * 0.02, -0.15)

    # =========================
    # 4. TERRENO
    # =========================
    terrain_penalty = 0.0

    if road_grade >= 6 and distance_km < 40:
        terrain_penalty = 0.22
    elif 2 <= road_grade < 6 and distance_km >= 40:
        terrain_penalty = 0.10
    elif abs(road_grade) < 2 and distance_km < 60:
        terrain_penalty = 0.08

    # =========================
    # 5. CLIMA
    # =========================
    CLIMATE = {
        "normal": 0.00,
        "rain": 0.05,
        "cold": 0.07,
        "hot": 0.04,
        "windy": 0.06,
        "mild": 0.03,
        "rain": 0.07,
        "snowy": 0.12,
    }

    climate_penalty = CLIMATE.get(climate, 0.0)

    # =========================
    # 6. MOTOR
    # =========================
    engine_penalty = 0.0
    engine_type = engine_type.lower()

    if "diesel" in engine_type:
        engine_penalty = -0.06
    elif "hybrid" in engine_type:
        engine_penalty = -0.12

    road_multipliers = {
        "city": 1.16,
        "mixed": 1.00,
        "highway": 1.00,
        "rural": 1.08,
    }
    road_multiplier = road_multipliers.get(road_profile, 1.0)

    # =========================
    # TOTAL
    # =========================
    total_penalty = (
        weight_penalty
        + grade_penalty
        + terrain_penalty
        + climate_penalty
        + engine_penalty
    )

    total_penalty = max(total_penalty, -0.25)

    return adjusted_base_fc * (1 + total_penalty) * road_multiplier


# 🔥 MOTOR POR SEGMENTOS (FIX COMPLETO)
def calculate_trip_from_segments(
    *,
    base_fc: float,
    segments: list[dict],
    total_weight: float,
    base_weight: float,
    climate: str,
    engine_type: str = "gasoline",
    road_profile: str = "mixed",
):
    if not segments:
        raise ValueError("No hay segmentos para calcular")

    total_liters = 0.0
    total_distance = 0.0
    segment_results = []

    extra_weight = max(0, total_weight - base_weight)

    for segment in segments:
        # 🔥 FIX COMPATIBILIDAD
        d = segment.get("distance_km")
        if d is None:
            d = segment.get("distance")
        grade = segment.get("grade_percent")
        if grade is None:
            grade = segment.get("grade")

        if d is None or grade is None:
            raise ValueError(f"Segmento inválido: {segment}")

        fc = calculate_fuel_consumption(
            base_fc=base_fc,
            vehicle_weight=total_weight,
            extra_weight=extra_weight,
            road_grade=grade,
            climate=climate,
            distance_km=d,
            engine_type=engine_type,
            road_profile=road_profile,
        )

        liters = (fc / 100) * d

        total_liters += liters
        total_distance += d
        segment_results.append({
            "distance_km": round(d, 3),
            "grade_percent": round(grade, 2),
            "consumption_l100km": round(fc, 3),
            "fuel_used": round(liters, 4),
        })

    if total_distance <= 0:
        raise ValueError("Distancia total inválida en segmentos")

    adjusted_fc = (total_liters / total_distance) * 100

    return {
        "fuel_used": round(total_liters, 2),
        "adjusted_fc": round(adjusted_fc, 3),
        "segments": segment_results,
    }
