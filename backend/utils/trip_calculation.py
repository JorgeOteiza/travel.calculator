def calculate_fuel_consumption(
    base_fc: float,
    vehicle_weight: float,
    extra_weight: float,
    road_grade: float,
    climate: str,
    distance_km: float | None = None,
    engine_type: str | None = None,
):
    """
    Retorna consumo ajustado en L/100km
    """

    # =========================
    # 1️⃣ Ajuste por peso
    # =========================
    total_weight = vehicle_weight + extra_weight
    weight_factor = 1 + (total_weight / 1500) * 0.10
    adjusted_fc = base_fc * weight_factor

    # =========================
    # 2️⃣ Ajuste por pendiente
    # =========================
    if road_grade > 0:
        adjusted_fc *= 1 + (road_grade / 100)
    elif road_grade < 0:
        adjusted_fc *= 1 + (road_grade / 200)

    # =========================
    # 3️⃣ Ajuste por clima
    # =========================
    climate_modifiers = {
        "cold": 1.10,
        "hot": 1.05,
        "windy": 1.08,
        "snowy": 1.12,
        "mild": 1.00,
    }
    adjusted_fc *= climate_modifiers.get(climate, 1.0)

    # =========================
    # 4️⃣ Arranque en frío / trayectos cortos
    # =========================
    if distance_km is not None and distance_km < 5:
        adjusted_fc *= 1.15

    # =========================
    # 5️⃣ Tipo de motor (fase futura)
    # =========================
    if engine_type:
        engine_modifiers = {
            "diesel": 0.95,
            "turbo": 1.05,
            "hybrid": 0.85,
        }
        adjusted_fc *= engine_modifiers.get(engine_type.lower(), 1.0)

    return round(adjusted_fc, 3)
