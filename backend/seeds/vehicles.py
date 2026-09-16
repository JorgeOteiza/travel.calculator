import logging

from backend.extensions import db
from backend.models import Vehicle

logger = logging.getLogger("travelcalculator")

VEHICLES = [
    dict(
        make="Chevrolet", model="Spark", year=2021,
        fuel_type="gasoline", engine_cc=1200, engine_cylinders=4,
        weight_kg=1200, lkm_mixed=6.5, lkm_highway=5.2, mpg_mixed=None,
    ),
    dict(
        make="Chevrolet", model="Groove", year=2022,
        fuel_type="gasoline", engine_cc=1500, engine_cylinders=4,
        weight_kg=1320, lkm_mixed=7.1, lkm_highway=5.9, mpg_mixed=None,
    ),
    dict(
        make="Suzuki", model="Baleno", year=2021,
        fuel_type="gasoline", engine_cc=1400, engine_cylinders=4,
        weight_kg=950, lkm_mixed=5.4, lkm_highway=4.5, mpg_mixed=None,
    ),
    dict(
        make="KIA", model="Morning", year=2020,
        fuel_type="gasoline", engine_cc=1000, engine_cylinders=3,
        weight_kg=935, lkm_mixed=5.1, lkm_highway=4.3, mpg_mixed=None,
    ),
    dict(
        make="MG", model="ZS", year=2022,
        fuel_type="gasoline", engine_cc=1500, engine_cylinders=4,
        weight_kg=1290, lkm_mixed=7.2, lkm_highway=6.1, mpg_mixed=None,
    ),
    dict(
        make="Chery", model="Tiggo 2 GLX", year=2021,
        fuel_type="gasoline", engine_cc=1500, engine_cylinders=4,
        weight_kg=1295, lkm_mixed=8.3, lkm_highway=6.2, mpg_mixed=None,
    ),
]


def seed_vehicles():
    """Crea los vehículos base que falten en la base de datos (idempotente)."""
    created = 0

    for data in VEHICLES:
        exists = Vehicle.query.filter_by(
            make=data["make"], model=data["model"], year=data["year"],
        ).first()
        if exists:
            continue

        db.session.add(Vehicle(data_source="manual", **data))
        created += 1

    db.session.commit()
    logger.info("Seed de vehículos: %d vehículo(s) nuevo(s) creado(s).", created)
    return created
