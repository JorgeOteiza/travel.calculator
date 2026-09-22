import json
import logging
import math
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_cors import cross_origin
from sqlalchemy.exc import SQLAlchemyError

from backend.extensions import limiter
from backend.models import db, Trip, Vehicle, UserVehicle
from backend.services.distance_service import get_distance_km
from backend.services.weather_service import get_weather_from_coords
from backend.services.consumption_service import (
    ConsumptionError,
    calculate_trip_consumption,
    get_vehicle_data_issues,
    resolve_consumption_type,
)
from backend.services.driving_conditions_service import calculate_operating_conditions
from backend.services.custom_consumption_service import (
    adapt_user_consumption,
    kml_from_consumption,
)
from backend.utils.trip_calculation import calculate_trip_from_segments

from backend.services.polyline_service import decode_polyline, reduce_points
from backend.services.elevation_profile import get_elevation_for_points
from backend.services.elevation_profile_chart_service import (
    build_elevation_profile,
    build_elevation_segments,
)

from backend.config import ELEVATION_PROVIDER

logger = logging.getLogger("travelcalculator")

trip_calc_and_save_bp = Blueprint("trip_calc_and_save_bp", __name__)

PASSENGER_WEIGHT = 75
MAX_PASSENGERS = 8
MAX_FUEL_PRICE = 5000

# Vehículo personalizado ("No encuentro mi vehículo"): sin catálogo, sin
# homologación. Combustibles admitidos en esta primera versión — eléctrico e
# híbrido quedan fuera porque el rendimiento en km/L no les aplica.
CUSTOM_VEHICLE_FUEL_TYPES = {"gasoline", "diesel"}
MAX_CUSTOM_TEXT_LENGTH = 80
MIN_CUSTOM_YEAR = 1900
MAX_CUSTOM_YEAR = datetime.now(timezone.utc).year + 1

# Modo invitado (cálculo público): protecciones que no existían antes porque
# el único consumidor era un usuario autenticado con JWT de por medio. Un
# límite de caracteres en la polyline CODIFICADA (antes de decodificar) es lo
# único que acota su costo real: decode_polyline() no tiene tope propio, y
# reduce_points() solo recorta la lista YA decodificada. ~20000 caracteres
# es varias veces la longitud de una polyline real Santiago-Valparaíso.
MAX_POLYLINE_LENGTH = 20000
MAX_PUBLIC_PAYLOAD_BYTES = 32 * 1024
# El límite es por IP y vive en memoria del propio proceso (storage_uri
# "memory://" en backend/extensions.py). Es correcto para un solo worker,
# pero deja de ser un límite global confiable si en el futuro se agregan
# varios workers/procesos de Gunicorn o varias instancias de Render: cada
# uno llevaría su propio contador independiente. Migrar a un backend
# compartido (p. ej. Redis) queda fuera del alcance de este checkpoint.
PUBLIC_CALCULATE_RATE_LIMIT = "10 per minute"


def _validate_custom_vehicle(payload):
    """Valida el bloque custom_vehicle. Devuelve (datos, None) o (None, error)."""
    if not isinstance(payload, dict):
        return None, "Faltan los datos del vehículo personalizado"

    brand = str(payload.get("brand") or "").strip()
    model = str(payload.get("model") or "").strip()
    fuel_type = str(payload.get("fuel_type") or "").strip().lower()

    if not brand or len(brand) > MAX_CUSTOM_TEXT_LENGTH:
        return None, "Marca del vehículo inválida"
    if not model or len(model) > MAX_CUSTOM_TEXT_LENGTH:
        return None, "Modelo del vehículo inválido"

    try:
        year = int(payload.get("year"))
    except (TypeError, ValueError):
        return None, "Año del vehículo inválido"
    if not MIN_CUSTOM_YEAR <= year <= MAX_CUSTOM_YEAR:
        return None, "Año del vehículo inválido"

    if fuel_type not in CUSTOM_VEHICLE_FUEL_TYPES:
        return None, "Combustible no soportado para vehículo personalizado"

    return {"brand": brand, "model": model, "year": year, "fuel_type": fuel_type}, None


def _read_bounded_json(max_bytes):
    """Lee el cuerpo de la petición acotado a max_bytes, sin confiar en el
    header Content-Length. Un cliente puede omitirlo (p. ej. Transfer-
    Encoding: chunked) o mentir sobre él; request.get_json() en ese caso
    igual lee el body completo sin límite. Leer directamente del stream con
    tope cierra esa vía, exista o no Content-Length declarado.

    Devuelve (datos, None) o (None, (response, status)).
    """
    body = request.stream.read(max_bytes + 1)
    if len(body) > max_bytes:
        return None, (jsonify({"error": "Solicitud demasiado grande"}), 413)

    if not body:
        return {}, None

    try:
        data = json.loads(body)
    except ValueError:
        return {}, None

    if not isinstance(data, dict):
        return {}, None

    return data, None


def _validate_point(point, label):
    """Valida que origin/destination sean coordenadas numéricas y finitas
    dentro de su rango geográfico real. Antes solo se comprobaba que el
    objeto no fuera falsy, sin validar tipo ni rango."""
    if not isinstance(point, dict):
        return f"{label} inválido"

    lat = point.get("lat")
    lng = point.get("lng")

    if isinstance(lat, bool) or isinstance(lng, bool):
        return f"{label} inválido"
    if not isinstance(lat, (int, float)) or not isinstance(lng, (int, float)):
        return f"{label} inválido"
    if not math.isfinite(lat) or not math.isfinite(lng):
        return f"{label} inválido"
    if not -90 <= lat <= 90 or not -180 <= lng <= 180:
        return f"{label} fuera de rango"

    return None


def _compute_trip(data):
    """Cálculo puro compartido por /trips/calculate-and-save y
    /trips/calculate. No realiza ninguna escritura en base de datos: la
    única consulta que ejecuta es la lectura de solo-lectura del catálogo
    (Vehicle.query) cuando corresponde a un vehículo de catálogo.

    Devuelve (resultado, None) en éxito o (None, (response, status)) cuando
    la validación falla, para que el llamador simplemente haga
    `return error` sin duplicar el manejo de errores.
    """
    # ===============================
    # 🔎 VALIDACIÓN
    # ===============================
    is_custom_vehicle = data.get("is_custom_vehicle") is True

    required_fields = [
        "origin", "destination",
        "passengers", "route_polyline"
    ]
    if not is_custom_vehicle:
        required_fields += ["brand", "model", "year"]

    for field in required_fields:
        if field not in data:
            return None, (jsonify({"error": f"Falta el campo '{field}'"}), 400)

    if not is_custom_vehicle:
        brand = str(data["brand"]).lower().strip()
        model = str(data["model"]).lower().strip()
        year = int(data["year"])
    passengers = int(data["passengers"])

    if passengers < 0 or passengers > MAX_PASSENGERS:
        return None, (jsonify({"error": "Pasajeros inválidos"}), 400)

    extra_weight = float(data.get("extra_weight") or 0)
    fuel_price = float(data.get("fuel_price") or 0)
    fuel_octane = str(data.get("fuel_octane") or "").strip()[:20] or None
    consumption_mode = str(data.get("consumption_mode") or "standard").lower()
    if consumption_mode not in {"standard", "custom"}:
        return None, (jsonify({"error": "Origen del rendimiento inválido"}), 400)

    if is_custom_vehicle and consumption_mode != "custom":
        return None, (jsonify({
            "error": "El vehículo personalizado requiere indicar un rendimiento conocido"
        }), 400)

    consumption_reference_profile = str(
        data.get("consumption_reference_profile") or "mixed"
    ).lower()

    custom_consumption_context = None

    if consumption_mode == "custom":
        if is_custom_vehicle:
            consumption_unit = str(data.get("consumption_unit") or "").lower()
            if consumption_unit not in {"kml", "l100km"}:
                return None, (jsonify({"error": "Unidad de consumo inválida"}), 400)

            raw_consumption = data.get("consumption_value")
            try:
                raw_consumption = float(raw_consumption)
            except (TypeError, ValueError):
                return None, (jsonify({"error": "Ingresa un rendimiento actual válido"}), 400)
            if not math.isfinite(raw_consumption) or raw_consumption <= 0:
                return None, (jsonify({"error": "Ingresa un rendimiento actual válido"}), 400)

            try:
                user_consumption_kml = kml_from_consumption(raw_consumption, consumption_unit)
            except ValueError as exc:
                return None, (jsonify({"error": str(exc)}), 400)
        else:
            user_consumption_kml = data.get("user_consumption_kml")
            try:
                user_consumption_kml = float(user_consumption_kml)
            except (TypeError, ValueError):
                return None, (jsonify({"error": "Ingresa un rendimiento actual válido"}), 400)

        if not math.isfinite(user_consumption_kml) or not 2 <= user_consumption_kml <= 40:
            return None, (jsonify({"error": "El rendimiento debe estar entre 2 y 40 km/L"}), 400)
        if consumption_reference_profile not in {"city", "mixed", "highway", "rural"}:
            return None, (jsonify({"error": "Contexto del rendimiento inválido"}), 400)
    else:
        user_consumption_kml = None
        consumption_reference_profile = None

    road_profile = str(data.get("road_profile") or "mixed").lower()
    driving_style = str(data.get("driving_style") or "moderate").lower()
    if driving_style not in {"calm", "moderate", "hurried"}:
        return None, (jsonify({"error": "Estilo de conducción inválido"}), 400)
    local_hour = data.get("local_hour")
    if local_hour is not None:
        local_hour = int(local_hour)
        if not 0 <= local_hour <= 23:
            return None, (jsonify({"error": "Hora local inválida"}), 400)
    if road_profile not in {"city", "mixed", "highway", "rural"}:
        return None, (jsonify({"error": "Tipo de vía inválido"}), 400)

    if fuel_price < 0 or fuel_price > MAX_FUEL_PRICE:
        return None, (jsonify({"error": "Precio de combustible inválido"}), 400)

    origin = data["origin"]
    destination = data["destination"]
    origin_label = str(data.get("origin_label") or "").strip()[:255]
    destination_label = str(data.get("destination_label") or "").strip()[:255]
    polyline = data["route_polyline"]

    if not origin or not destination:
        return None, (jsonify({"error": "Origen o destino inválidos"}), 400)

    origin_error = _validate_point(origin, "Origen")
    if origin_error:
        return None, (jsonify({"error": origin_error}), 400)
    destination_error = _validate_point(destination, "Destino")
    if destination_error:
        return None, (jsonify({"error": destination_error}), 400)

    if not polyline:
        return None, (jsonify({"error": "Polyline inválida"}), 400)
    if not isinstance(polyline, str) or len(polyline) > MAX_POLYLINE_LENGTH:
        return None, (jsonify({
            "error": "Geometría de ruta inválida o demasiado extensa"
        }), 400)

    # ===============================
    # 🚗 VEHÍCULO
    # ===============================
    if is_custom_vehicle:
        custom_vehicle, custom_vehicle_error = _validate_custom_vehicle(
            data.get("custom_vehicle")
        )
        if custom_vehicle_error:
            return None, (jsonify({"error": custom_vehicle_error}), 400)

        vehicle = None
        fuel_type = custom_vehicle["fuel_type"]
        is_electric = False  # combustibles admitidos: solo gasoline/diesel

        # ===============================
        # ⚖️ PESO — sin peso base inventado, ver Checkpoint 2 aprobado
        # ===============================
        base_weight = 0.0
        total_weight = extra_weight + (passengers * PASSENGER_WEIGHT)
    else:
        custom_vehicle = None
        vehicle = Vehicle.query.filter(
            db.func.lower(Vehicle.make) == brand,
            db.func.lower(Vehicle.model) == model,
            Vehicle.year == year,
        ).first()

        if not vehicle:
            return None, (jsonify({"error": "Vehículo no encontrado"}), 404)

        vehicle_issues = get_vehicle_data_issues(vehicle)
        if vehicle_issues:
            return None, (jsonify({
                "error": "Vehículo sin datos suficientes para calcular",
                "missing": vehicle_issues,
            }), 422)

        fuel_type = vehicle.fuel_type or "gasoline"
        is_electric = "electric" in fuel_type.lower()

        # ===============================
        # ⚖️ PESO
        # ===============================
        base_weight = float(vehicle.weight_kg or 1500)
        total_weight = base_weight + extra_weight + (passengers * PASSENGER_WEIGHT)

    # ===============================
    # 📏 DISTANCIA
    # ===============================
    try:
        distance_km = float(get_distance_km(origin, destination, polyline=polyline))
    except Exception:
        logger.exception("Error calculando distancia")
        return None, (jsonify({"error": "Error calculando distancia"}), 500)

    if distance_km <= 0:
        return None, (jsonify({"error": "Distancia inválida"}), 400)

    # ===============================
    # 🌦️ CLIMA
    # ===============================
    try:
        weather_data = get_weather_from_coords(origin)
        climate_label = weather_data.get("climate", "unknown")
    except Exception:
        logger.exception("Error obteniendo clima")
        climate_label = "unknown"

    # ===============================
    # ⛰️ PERFIL Y SEGMENTOS DE ELEVACIÓN
    # ===============================
    try:
        decoded_points = decode_polyline(polyline)
        reduced_points = reduce_points(decoded_points, max_points=100)
        elevations = get_elevation_for_points(reduced_points)
        elevation_profile = build_elevation_profile(reduced_points, elevations)
        segments = build_elevation_segments(reduced_points, elevations)
        if not segments:
            raise ValueError("Perfil de elevación vacío")
        elevation_source = ELEVATION_PROVIDER

    except Exception:
        logger.exception("Error calculando segmentos de elevación")
        segments = [{
            "distance_km": distance_km,
            "grade_percent": 0
        }]
        elevation_profile = []
        elevation_source = "flat_fallback"

    # ===============================
    # 🛣️ ROAD GRADE (FIX CRÍTICO)
    # ===============================
    try:
        segment_distance = sum(s.get("distance_km", 0) for s in segments)
        avg_grade = (
            sum(s.get("grade_percent", 0) * s.get("distance_km", 0) for s in segments)
            / segment_distance
            if segment_distance > 0 else 0
        )
    except Exception:
        logger.exception("Error calculando road_grade")
        avg_grade = 0

    road_grade = round(avg_grade, 2)

    # ===============================
    # ⛽ CONSUMO
    # ===============================
    if is_electric:
        fuel_used = 0.0
        adjusted_consumption = 0.0
        base_consumption = 0.0
        total_cost = 0.0
        consumption_type = "electric"
        consumption_segments = []
        operating_conditions = None

    else:
        if vehicle is not None:
            base_data = calculate_trip_consumption(
                vehicle=vehicle,
                total_km=distance_km,
                highway_km=data.get("highway_km"),
                road_profile=road_profile,
            )
            consumption_type = base_data.get("consumption_type", "mixed")
            base_consumption = float(base_data.get("base_consumption", 0))
        else:
            # Vehículo personalizado: no hay lkm_mixed/lkm_highway de catálogo,
            # el consumo base sale exclusivamente del rendimiento declarado
            # por el usuario (ver bloque siguiente). Solo reutilizamos la
            # misma clasificación mixed/highway que usa el catálogo.
            consumption_type = (
                "highway" if road_profile == "highway"
                else resolve_consumption_type(
                    total_km=distance_km, highway_km=data.get("highway_km")
                )
            )
            base_consumption = 0.0

        if user_consumption_kml is not None:
            custom_consumption_context = adapt_user_consumption(
                consumption_kml=user_consumption_kml,
                reference_profile=consumption_reference_profile,
                target_profile=road_profile,
                distance_km=distance_km,
            )
            base_consumption = custom_consumption_context["base_l100km"]

        route_result = calculate_trip_from_segments(
            base_fc=base_consumption,
            segments=segments,
            total_weight=total_weight,
            base_weight=base_weight,
            climate=climate_label,
            engine_type=fuel_type,
            road_profile=road_profile,
        )

        adjusted_consumption = float(route_result.get("adjusted_fc", 0))
        consumption_segments = route_result.get("segments", [])

        operating_conditions = calculate_operating_conditions(
            distance_km=distance_km,
            road_profile=("context_adjusted" if custom_consumption_context else road_profile),
            departure_hour=local_hour,
            driving_style=driving_style,
        )
        operating_factor = operating_conditions["operating_factor"]
        adjusted_consumption *= operating_factor
        consumption_segments = [
            {
                **segment,
                "consumption_l100km": round(
                    segment["consumption_l100km"] * operating_factor, 3
                ),
                "fuel_used": round(
                    segment["fuel_used"] * operating_factor, 4
                ),
            }
            for segment in consumption_segments
        ]

        calibration_factor = (
            float(vehicle.calibration_factor or 1.0) if vehicle is not None else 1.0
        )
        calibration_factor = max(0.7, min(calibration_factor, 1.3))

        adjusted_consumption *= calibration_factor
        consumption_segments = [
            {
                **segment,
                "consumption_l100km": round(
                    segment["consumption_l100km"] * calibration_factor, 3
                ),
                "fuel_used": round(
                    segment["fuel_used"] * calibration_factor, 4
                ),
            }
            for segment in consumption_segments
        ]
        fuel_used = (adjusted_consumption / 100) * distance_km
        total_cost = fuel_used * fuel_price

    computed = {
        "vehicle": vehicle,
        "custom_vehicle": custom_vehicle,
        "fuel_type": fuel_type,
        "is_electric": is_electric,
        "total_weight": total_weight,
        "passengers": passengers,
        "fuel_price": fuel_price,
        "fuel_octane": fuel_octane,
        "consumption_mode": consumption_mode,
        "user_consumption_kml": user_consumption_kml,
        "consumption_reference_profile": consumption_reference_profile,
        "custom_consumption_context": custom_consumption_context,
        "road_profile": road_profile,
        "driving_style": driving_style,
        "origin": origin,
        "destination": destination,
        "origin_label": origin_label,
        "destination_label": destination_label,
        "distance_km": distance_km,
        "climate_label": climate_label,
        "segments": segments,
        "elevation_profile": elevation_profile,
        "elevation_source": elevation_source,
        "road_grade": road_grade,
        "consumption_type": consumption_type,
        "base_consumption": base_consumption,
        "adjusted_consumption": adjusted_consumption,
        "consumption_segments": consumption_segments,
        "operating_conditions": operating_conditions,
        "fuel_used": fuel_used,
        "total_cost": total_cost,
    }
    return computed, None


def _build_response_payload(computed, *, saved, trip_id=None):
    """Construye el JSON de respuesta a partir del resultado de
    _compute_trip(). Usada por ambos endpoints para que su contrato no
    pueda divergir por accidente: solo cambian 'saved' y 'id'."""
    is_electric = computed["is_electric"]
    vehicle = computed["vehicle"]
    custom_vehicle = computed["custom_vehicle"]

    payload = {
        "distance": round(computed["distance_km"], 2),
        "fuelUsed": round(computed["fuel_used"], 2),
        "totalCost": round(computed["total_cost"], 2),
        "adjustedFC": round(computed["adjusted_consumption"], 3),
        "baseFC": round(computed["base_consumption"], 3),
        "fuelOctane": computed["fuel_octane"],
        "userConsumptionKml": computed["user_consumption_kml"],
        "consumptionReferenceProfile": computed["consumption_reference_profile"],
        "customConsumptionContext": (
            computed["custom_consumption_context"] if not is_electric else None
        ),
        "consumptionSource": computed["consumption_mode"],
        "weather": computed["climate_label"],
        "roadGrade": computed["road_grade"],
        "roadProfile": computed["road_profile"],
        "drivingStyle": computed["driving_style"],
        "segmentsAnalyzed": len(computed["segments"]),
        "elevationProfile": computed["elevation_profile"],
        "elevationSource": computed["elevation_source"],
        "consumptionProfile": computed["consumption_segments"],
        "operatingConditions": (
            computed["operating_conditions"] if not is_electric else {
                "departure_hour": None,
                "traffic_level": "no aplica",
                "traffic_factor": 1.0,
                "short_trip_factor": 1.0,
                "operating_factor": 1.0,
                "is_short_trip": False,
                "method": "no aplica a vehículo eléctrico",
            }
        ),
        "isCustomVehicle": vehicle is None,
        "vehicle": (
            {
                "make": vehicle.make,
                "model": vehicle.model,
                "year": vehicle.year,
                "fuel_type": computed["fuel_type"],
                "engine_cc": vehicle.engine_cc,
                "weight_kg": vehicle.weight_kg,
                "lkm_mixed": vehicle.lkm_mixed,
            }
            if vehicle is not None else {
                "make": custom_vehicle["brand"],
                "model": custom_vehicle["model"],
                "year": custom_vehicle["year"],
                "fuel_type": computed["fuel_type"],
                "engine_cc": None,
                "weight_kg": None,
                "lkm_mixed": None,
            }
        ),
        "origin": computed["origin"],
        "destination": computed["destination"],
        "saved": saved,
    }
    if saved:
        payload["id"] = trip_id
    return payload


@trip_calc_and_save_bp.route("/trips/calculate-and-save", methods=["POST"])
@cross_origin()
@jwt_required()
def calculate_and_save_trip():
    try:
        user_id = get_jwt_identity()
        data = request.get_json(silent=True) or {}

        logger.debug("Calculate-and-save request data: %s", data)

        computed, error = _compute_trip(data)
        if error:
            return error

        vehicle = computed["vehicle"]
        custom_vehicle = computed["custom_vehicle"]

        # ===============================
        # 💾 GUARDAR
        # ===============================
        trip = Trip(
            user_id=user_id,
            vehicle_id=(vehicle.id if vehicle is not None else None),
            brand=(vehicle.make if vehicle is not None else custom_vehicle["brand"]),
            model=(vehicle.model if vehicle is not None else custom_vehicle["model"]),
            year=(vehicle.year if vehicle is not None else custom_vehicle["year"]),
            fuel_type=computed["fuel_type"],
            fuel_price=float(computed["fuel_price"]),
            fuel_octane=computed["fuel_octane"],
            # Vehículo personalizado: total_weight NO representa el peso del
            # vehículo (desconocido), representa únicamente pasajeros + carga
            # adicional declarados. El frontend debe presentarlo acorde
            # ("Pasajeros y carga"), nunca como "Peso total del vehículo".
            total_weight=float(computed["total_weight"]),
            passengers=int(computed["passengers"]),
            location=f"{computed['origin'].get('lat')},{computed['origin'].get('lng')}",
            origin_label=computed["origin_label"] or f"{computed['origin'].get('lat')},{computed['origin'].get('lng')}",
            destination_label=computed["destination_label"] or f"{computed['destination'].get('lat')},{computed['destination'].get('lng')}",
            distance=float(computed["distance_km"]),

            road_grade=computed["road_grade"],  # 🔥 FIX
            road_profile=computed["road_profile"],
            driving_style=computed["driving_style"],

            consumption_type=computed["consumption_type"],
            base_consumption=float(computed["base_consumption"]),
            expected_consumption=float(computed["adjusted_consumption"]),
            adjusted_consumption=float(computed["adjusted_consumption"]),
            user_consumption_kml=computed["user_consumption_kml"],
            consumption_reference_profile=computed["consumption_reference_profile"],
            consumption_source=computed["consumption_mode"],
            calibration_factor_used=(
                float(vehicle.calibration_factor or 1.0) if vehicle is not None else None
            ),
            elevation_profile=computed["elevation_profile"],
            consumption_profile=computed["consumption_segments"],
            elevation_source=computed["elevation_source"],
            segments_analyzed=len(computed["segments"]),
            operating_conditions=(
                computed["operating_conditions"] if not computed["is_electric"] else None
            ),
            fuel_consumed=float(computed["fuel_used"]),
            total_cost=float(computed["total_cost"]),
            weather=computed["climate_label"],
        )

        db.session.add(trip)

        if vehicle is not None and not UserVehicle.query.filter_by(
            user_id=user_id,
            vehicle_id=vehicle.id
        ).first():
            db.session.add(UserVehicle(
                user_id=user_id,
                vehicle_id=vehicle.id
            ))

        db.session.commit()

        return jsonify(_build_response_payload(computed, saved=True, trip_id=trip.id)), 201

    except ConsumptionError as e:
        return jsonify({"error": str(e)}), 422

    except SQLAlchemyError:
        db.session.rollback()
        raise


@trip_calc_and_save_bp.route("/trips/calculate", methods=["POST"])
@cross_origin()
@limiter.limit(PUBLIC_CALCULATE_RATE_LIMIT)
def calculate_trip_public():
    """Cálculo público (modo invitado): mismo motor que calculate-and-save,
    sin JWT y sin ninguna escritura en base de datos. Ver _compute_trip()."""
    try:
        data, error = _read_bounded_json(MAX_PUBLIC_PAYLOAD_BYTES)
        if error:
            return error

        logger.debug("Public calculate request data: %s", data)

        computed, error = _compute_trip(data)
        if error:
            return error

        return jsonify(_build_response_payload(computed, saved=False)), 200

    except ConsumptionError as e:
        return jsonify({"error": str(e)}), 422

    except SQLAlchemyError:
        db.session.rollback()
        raise
