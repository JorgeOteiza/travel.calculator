from backend.utils.trip_calculation import calculate_fuel_consumption


def calculate_route_consumption(
    segments,
    vehicle,
    extra_weight,
    climate,
):
    """
    Calcula el consumo total del viaje usando segmentos de ruta.
    Cada segmento tiene su propia pendiente.
    """

    total_fuel_used = 0
    total_distance = 0
    segment_results = []

    for segment in segments:

        distance_km = segment["distance"]
        grade = segment["grade"]

        adjusted_fc = calculate_fuel_consumption(
            base_fc=vehicle.lkm_mixed,
            vehicle_weight=vehicle.weight_kg,
            extra_weight=extra_weight,
            road_grade=grade,
            climate=climate,
            distance_km=distance_km,
            engine_type=vehicle.fuel_type,
            debug=False,
        )

        fuel_used = (distance_km * adjusted_fc) / 100

        total_fuel_used += fuel_used
        total_distance += distance_km

        segment_results.append({
            "distance": distance_km,
            "grade": grade,
            "fc": adjusted_fc,
            "fuel_used": fuel_used
        })

    return {
        "total_distance": round(total_distance, 2),
        "fuel_used": round(total_fuel_used, 3),
        "segments": segment_results
    }