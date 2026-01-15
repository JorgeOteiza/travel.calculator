def update_vehicle_calibration(
    vehicle,
    estimated_fuel_l: float,
    real_fuel_l: float,
):
    """
    Ajusta el calibration_factor del vehículo usando media móvil.
    """

    # ===============================
    # VALIDACIONES
    # ===============================
    if estimated_fuel_l <= 0 or real_fuel_l <= 0:
        return

    ratio = real_fuel_l / estimated_fuel_l

    # límites de seguridad (±25%)
    ratio = max(0.75, min(ratio, 1.25))

    # ===============================
    # MEDIA MÓVIL PONDERADA
    # ===============================
    samples = vehicle.calibration_samples
    current_factor = vehicle.calibration_factor

    new_factor = (
        (current_factor * samples) + ratio
    ) / (samples + 1)

    # límites globales
    new_factor = max(0.85, min(new_factor, 1.25))

    # ===============================
    # PERSISTENCIA
    # ===============================
    vehicle.calibration_factor = round(new_factor, 4)
    vehicle.calibration_samples = samples + 1
