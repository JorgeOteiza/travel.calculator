def apply_vehicle_calibration(trip, alpha=0.15):
    if not trip.real_consumption or not trip.expected_consumption:
        return

    vehicle = trip.vehicle
    if not vehicle:
        return

    ratio = trip.real_consumption / trip.expected_consumption

    if ratio < 0.5 or ratio > 1.8:
        return  # outlier duro

    new_factor = (
        vehicle.calibration_factor * (1 - alpha)
        + ratio * alpha
    )

    vehicle.calibration_factor = max(0.7, min(new_factor, 1.3))
    vehicle.calibration_samples += 1

    trip.calibration_factor_used = vehicle.calibration_factor
