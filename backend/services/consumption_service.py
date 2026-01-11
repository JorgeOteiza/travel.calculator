from typing import Literal, Dict

ConsumptionType = Literal["mixed", "highway"]


class ConsumptionError(Exception):
    """Error de dominio para cálculo de consumo"""
    pass


def resolve_consumption_type(
    total_km: float,
    highway_km: float | None
) -> ConsumptionType:
    """
    Decide si el viaje es principalmente highway o mixed.

    Regla:
    - Si >= 70% del viaje es carretera → highway
    - Caso contrario → mixed
    """

    if highway_km is None or total_km <= 0:
        return "mixed"

    ratio = highway_km / total_km
    return "highway" if ratio >= 0.7 else "mixed"


def resolve_base_consumption(
    vehicle,
    consumption_type: ConsumptionType
) -> float:
    """
    Obtiene el consumo base (L/100km) según el tipo de viaje.

    Fallbacks:
    - highway → lkm_highway
    - highway sin dato → lkm_mixed * 0.9
    - mixed → lkm_mixed
    """

    if consumption_type == "highway":
        if vehicle.lkm_highway:
            return vehicle.lkm_highway

        if vehicle.lkm_mixed:
            return round(vehicle.lkm_mixed * 0.9, 2)

        raise ConsumptionError("Vehículo sin consumo highway ni mixed")

    # mixed
    if vehicle.lkm_mixed:
        return vehicle.lkm_mixed

    raise ConsumptionError("Vehículo sin consumo mixed")


def calculate_trip_consumption(
    *,
    vehicle,
    total_km: float,
    highway_km: float | None = None
) -> Dict:
    """
    Función principal usada por el endpoint.

    Retorna:
    {
        consumption_type,
        base_consumption
    }
    """

    consumption_type = resolve_consumption_type(
        total_km=total_km,
        highway_km=highway_km
    )

    base_consumption = resolve_base_consumption(
        vehicle=vehicle,
        consumption_type=consumption_type
    )

    return {
        "consumption_type": consumption_type,
        "base_consumption": base_consumption
    }
