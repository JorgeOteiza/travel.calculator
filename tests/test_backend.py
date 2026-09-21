import os
import unittest
from datetime import datetime
from unittest.mock import Mock, patch

import polyline as polyline_codec

os.environ["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-with-at-least-32-bytes"
os.environ["DEBUG"] = "False"

from app import create_app
from backend.extensions import db
from backend.models import Vehicle, Trip, UserVehicle
from backend.utils.trip_calculation import (
    calculate_fuel_consumption,
    calculate_trip_from_segments,
)
from backend.services.elevation_profile_chart_service import build_elevation_segments
from backend.services.elevation_profile import get_elevation_for_points
from backend.services.weather_service import get_weather_from_coords
from backend.services.driving_conditions_service import calculate_operating_conditions
from backend.services.custom_consumption_service import adapt_user_consumption


class CalculationTests(unittest.TestCase):
    def test_custom_city_consumption_improves_on_long_highway(self):
        city = adapt_user_consumption(
            consumption_kml=9.4,
            reference_profile="city",
            target_profile="city",
            distance_km=20,
        )
        highway = adapt_user_consumption(
            consumption_kml=9.4,
            reference_profile="city",
            target_profile="highway",
            distance_km=100,
        )
        self.assertAlmostEqual(city["adapted_kml"], 9.4, places=1)
        self.assertGreater(highway["adapted_kml"], city["adapted_kml"])

    def test_custom_mixed_consumption_is_between_city_and_long_highway(self):
        common = dict(consumption_kml=9.4, reference_profile="mixed")
        city = adapt_user_consumption(target_profile="city", distance_km=20, **common)
        mixed = adapt_user_consumption(target_profile="mixed", distance_km=20, **common)
        highway = adapt_user_consumption(target_profile="highway", distance_km=100, **common)
        self.assertLess(city["adapted_kml"], mixed["adapted_kml"])
        self.assertLess(mixed["adapted_kml"], highway["adapted_kml"])

    def test_short_city_trip_in_peak_hour_has_highest_operating_factor(self):
        peak = calculate_operating_conditions(
            distance_km=5.7,
            road_profile="city",
            departure_time=datetime(2026, 8, 11, 18, 0),
        )
        off_peak = calculate_operating_conditions(
            distance_km=5.7,
            road_profile="city",
            departure_time=datetime(2026, 8, 11, 11, 0),
        )
        long_trip = calculate_operating_conditions(
            distance_km=30,
            road_profile="city",
            departure_time=datetime(2026, 8, 11, 11, 0),
        )
        self.assertEqual(peak["traffic_level"], "hora punta")
        self.assertGreater(peak["operating_factor"], off_peak["operating_factor"])
        self.assertGreater(off_peak["operating_factor"], long_trip["operating_factor"])

    def test_highway_does_not_receive_urban_peak_penalty(self):
        conditions = calculate_operating_conditions(
            distance_km=30,
            road_profile="highway",
            departure_time=datetime(2026, 8, 11, 18, 0),
        )
        self.assertEqual(conditions["traffic_factor"], 1.0)

    def test_hurried_driving_consumes_more_than_calm_driving(self):
        common = dict(distance_km=12, road_profile="mixed", departure_hour=14)
        calm = calculate_operating_conditions(driving_style="calm", **common)
        hurried = calculate_operating_conditions(driving_style="hurried", **common)
        self.assertLess(calm["operating_factor"], hurried["operating_factor"])

    def test_flat_route_has_positive_consumption(self):
        value = calculate_fuel_consumption(
            base_fc=7.0,
            vehicle_weight=1200,
            extra_weight=0,
            road_grade=0,
            climate="normal",
            distance_km=20,
        )
        self.assertGreater(value, 0)
        self.assertEqual(value, 7.0)

    def test_uphill_consumes_more_than_flat(self):
        common = dict(
            base_fc=7.0, vehicle_weight=1200, extra_weight=100,
            climate="normal", distance_km=20,
        )
        flat = calculate_fuel_consumption(road_grade=0, **common)
        uphill = calculate_fuel_consumption(road_grade=6, **common)
        self.assertGreater(uphill, flat)

    def test_city_consumes_more_than_highway(self):
        common = dict(
            base_fc=7.0, vehicle_weight=1200, extra_weight=0,
            climate="normal", distance_km=20, road_grade=0,
        )
        city = calculate_fuel_consumption(road_profile="city", **common)
        highway = calculate_fuel_consumption(road_profile="highway", **common)
        self.assertGreater(city, highway)

    def test_extra_weight_increases_consumption(self):
        common = dict(
            base_fc=7.0, vehicle_weight=1200, road_grade=0,
            climate="normal", distance_km=20,
        )
        empty = calculate_fuel_consumption(extra_weight=0, **common)
        loaded = calculate_fuel_consumption(extra_weight=300, **common)
        self.assertGreater(loaded, empty)

    def test_elevation_segments_are_deterministic(self):
        points = [
            {"lat": -33.45, "lng": -70.66},
            {"lat": -33.44, "lng": -70.65},
            {"lat": -33.43, "lng": -70.64},
        ]
        elevations = [500.0, 515.0, 505.0]
        first = build_elevation_segments(points, elevations)
        second = build_elevation_segments(points, elevations)
        self.assertEqual(first, second)
        self.assertGreater(first[0]["grade_percent"], 0)
        self.assertLess(first[1]["grade_percent"], 0)

    def test_flat_zero_grade_segment_is_valid(self):
        result = calculate_trip_from_segments(
            base_fc=7.0,
            segments=[{"distance_km": 10, "grade_percent": 0}],
            total_weight=1200,
            base_weight=1200,
            climate="normal",
        )
        self.assertGreater(result["fuel_used"], 0)

    def test_snow_increases_consumption_more_than_mild_weather(self):
        common = dict(
            base_fc=7.0, vehicle_weight=1200, extra_weight=0,
            road_grade=0, distance_km=20,
        )
        mild = calculate_fuel_consumption(climate="mild", **common)
        snow = calculate_fuel_consumption(climate="snowy", **common)
        self.assertGreater(snow, mild)

    @patch("backend.services.elevation_profile.requests.get")
    def test_elevation_uses_one_open_meteo_request_without_key(self, request_get):
        response = Mock()
        response.json.return_value = {"elevation": [500.0, 510.0]}
        response.raise_for_status.return_value = None
        request_get.return_value = response
        values = get_elevation_for_points([
            {"lat": -33.45, "lng": -70.66},
            {"lat": -33.44, "lng": -70.65},
        ])
        self.assertEqual(values, [500.0, 510.0])
        request_get.assert_called_once()
        self.assertIn("open-meteo.com", request_get.call_args.args[0])
        self.assertNotIn("key", request_get.call_args.kwargs["params"])

    @patch("backend.services.weather_service.requests.get")
    def test_weather_uses_open_meteo_without_key(self, request_get):
        response = Mock()
        response.json.return_value = {
            "current": {
                "temperature_2m": 18,
                "wind_speed_10m": 2,
                "rain": 1,
                "precipitation": 1,
                "snowfall": 0,
            }
        }
        response.raise_for_status.return_value = None
        request_get.return_value = response
        result = get_weather_from_coords({"lat": -33.45, "lng": -70.66})
        self.assertEqual(result["climate"], "rain")
        request_get.assert_called_once()
        self.assertIn("open-meteo.com", request_get.call_args.args[0])


class AuthenticationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.app.config.update(TESTING=True)
        with cls.app.app_context():
            db.create_all()

    def test_register_and_login(self):
        client = self.app.test_client()
        register = client.post("/api/register", json={
            "name": "Demo User", "email": "demo@example.com", "password": "secure123"
        })
        self.assertEqual(register.status_code, 201)
        self.assertIn("jwt", register.get_json())

        login = client.post("/api/login", json={
            "email": "demo@example.com", "password": "secure123"
        })
        self.assertEqual(login.status_code, 200)
        self.assertIn("jwt", login.get_json())

    def test_delete_trip_requires_ownership(self):
        client = self.app.test_client()
        owner = client.post("/api/register", json={
            "name": "Owner", "email": "owner@example.com", "password": "secure123"
        }).get_json()
        intruder = client.post("/api/register", json={
            "name": "Intruder", "email": "intruder@example.com", "password": "secure123"
        }).get_json()
        owner_token = owner["jwt"]
        intruder_token = intruder["jwt"]

        with self.app.app_context():
            trip = Trip(
                user_id=owner["user"]["id"],
                brand="Owner Vehicle", model="X", year=2024,
                fuel_type="gasoline", fuel_price=1000,
                total_weight=1200, passengers=1,
                location="Test", distance=10,
                road_grade=0, weather="mild",
                expected_consumption=7.0,
                fuel_consumed=1, total_cost=1000,
            )
            db.session.add(trip)
            db.session.commit()
            trip_id = trip.id

        delete_by_intruder = client.delete(
            f"/api/trips/{trip_id}",
            headers={"Authorization": f"Bearer {intruder_token}"},
        )
        self.assertEqual(delete_by_intruder.status_code, 404)

        still_there = client.get(
            "/api/trips", headers={"Authorization": f"Bearer {owner_token}"}
        )
        self.assertTrue(any(t["id"] == trip_id for t in still_there.get_json()))

        delete_by_owner = client.delete(
            f"/api/trips/{trip_id}",
            headers={"Authorization": f"Bearer {owner_token}"},
        )
        self.assertEqual(delete_by_owner.status_code, 200)

    def test_logout_revokes_token(self):
        client = self.app.test_client()
        register = client.post("/api/register", json={
            "name": "Revocable", "email": "revocable@example.com", "password": "secure123"
        }).get_json()
        token = register["jwt"]
        auth_header = {"Authorization": f"Bearer {token}"}

        before_logout = client.get("/api/user", headers=auth_header)
        self.assertEqual(before_logout.status_code, 200)

        logout = client.post("/api/logout", headers=auth_header)
        self.assertEqual(logout.status_code, 200)

        after_logout = client.get("/api/user", headers=auth_header)
        self.assertEqual(after_logout.status_code, 401)

    def test_login_is_rate_limited(self):
        client = self.app.test_client()
        # Rate limiting is keyed by IP; use a dedicated fake IP so this test
        # doesn't consume the shared 127.0.0.1 bucket used by other tests.
        attacker_ip = {"REMOTE_ADDR": "203.0.113.50"}

        for _ in range(5):
            response = client.post(
                "/api/login",
                json={"email": "nobody@example.com", "password": "wrong"},
                environ_overrides=attacker_ip,
            )
            self.assertEqual(response.status_code, 401)

        blocked = client.post(
            "/api/login",
            json={"email": "nobody@example.com", "password": "wrong"},
            environ_overrides=attacker_ip,
        )
        self.assertEqual(blocked.status_code, 429)

    def test_jwt_secret_key_required_at_boot(self):
        original = os.environ.pop("JWT_SECRET_KEY", None)
        try:
            with self.assertRaises(RuntimeError):
                create_app()
        finally:
            if original is not None:
                os.environ["JWT_SECRET_KEY"] = original

    def test_seed_vehicles_is_idempotent(self):
        from backend.seeds.vehicles import seed_vehicles, VEHICLES

        with self.app.app_context():
            first_run = seed_vehicles()
            self.assertEqual(first_run, len(VEHICLES))

            second_run = seed_vehicles()
            self.assertEqual(second_run, 0)

            count = Vehicle.query.filter_by(
                make=VEHICLES[0]["make"],
                model=VEHICLES[0]["model"],
                year=VEHICLES[0]["year"],
            ).count()
            self.assertEqual(count, 1)

    def test_paid_google_backend_routes_are_blocked(self):
        client = self.app.test_client()
        self.assertEqual(client.get("/api/elevation?origin=1,1&destination=2,2").status_code, 403)
        self.assertEqual(client.get("/api/distance?origin=1,1&destination=2,2").status_code, 403)

    def test_vehicle_catalog_only_exposes_calculation_ready_records(self):
        with self.app.app_context():
            ready = Vehicle(
                make="Test Ready",
                model="Complete",
                year=2026,
                fuel_type="gasoline",
                weight_kg=1200,
                lkm_mixed=7.0,
            )
            incomplete = Vehicle(
                make="Test Incomplete",
                model="Missing consumption",
                year=2026,
                fuel_type="unknown",
                weight_kg=0,
                lkm_mixed=None,
            )
            db.session.add_all([ready, incomplete])
            db.session.commit()

        client = self.app.test_client()
        response = client.get("/api/cars/vehicles")
        self.assertEqual(response.status_code, 200)
        vehicles = response.get_json()
        self.assertTrue(any(vehicle["make"] == "Test Ready" for vehicle in vehicles))
        self.assertFalse(any(vehicle["make"] == "Test Incomplete" for vehicle in vehicles))

        unavailable = client.get(
            "/api/cars/model_details"
            "?make=Test%20Incomplete&model=Missing%20consumption&year=2026"
        )
        self.assertEqual(unavailable.status_code, 422)


class CustomVehicleTripTests(unittest.TestCase):
    """Cobertura de 'No encuentro mi vehículo' (Checkpoint 2 - backend)."""

    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.app.config.update(TESTING=True)
        with cls.app.app_context():
            db.create_all()

    def setUp(self):
        # Mocks locales de clima/elevación: nunca se consulta Open-Meteo real.
        self.weather_patch = patch(
            "backend.routes.trip_calculate_and_save.get_weather_from_coords",
            return_value={"climate": "mild", "source": "mock"},
        )
        self.elevation_patch = patch(
            "backend.routes.trip_calculate_and_save.get_elevation_for_points",
            side_effect=lambda points: [100.0] * len(points),
        )
        self.weather_patch.start()
        self.elevation_patch.start()
        self.addCleanup(self.weather_patch.stop)
        self.addCleanup(self.elevation_patch.stop)

    @staticmethod
    def _sample_polyline():
        return polyline_codec.encode([(-33.45, -70.66), (-33.03, -71.55)])

    _ip_counter = 0

    def _register(self, client, email):
        # Cada test usa una IP simulada distinta: /api/register está limitado
        # a 5/min por IP, y esta clase registra muchos usuarios en la misma
        # ejecución (mismo patrón que test_login_is_rate_limited).
        CustomVehicleTripTests._ip_counter += 1
        fake_ip = f"203.0.113.{CustomVehicleTripTests._ip_counter % 250 + 1}"
        response = client.post(
            "/api/register",
            json={"name": "Custom Vehicle User", "email": email, "password": "secure123"},
            environ_overrides={"REMOTE_ADDR": fake_ip},
        ).get_json()
        return response["jwt"], response["user"]["id"]

    def _base_payload(self, **overrides):
        payload = {
            "is_custom_vehicle": True,
            "custom_vehicle": {
                "brand": "Suzuki",
                "model": "Mastervan",
                "year": 2000,
                "fuel_type": "gasoline",
            },
            "consumption_mode": "custom",
            "consumption_value": 8.5,
            "consumption_unit": "kml",
            "consumption_reference_profile": "mixed",
            "origin": {"lat": -33.45, "lng": -70.66},
            "destination": {"lat": -33.03, "lng": -71.55},
            "origin_label": "Santiago",
            "destination_label": "Valparaíso",
            "route_polyline": self._sample_polyline(),
            "passengers": 2,
            "extra_weight": 15,
            "fuel_price": 1250,
            "road_profile": "mixed",
            "driving_style": "moderate",
        }
        payload.update(overrides)
        return payload

    def _calculate(self, client, token, payload):
        return client.post(
            "/api/trips/calculate-and-save",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
        )

    # ------------------------------------------------------------------
    # Casos válidos
    # ------------------------------------------------------------------

    def test_custom_vehicle_gasoline_succeeds(self):
        client = self.app.test_client()
        token, user_id = self._register(client, "custom-gas@example.com")

        response = self._calculate(client, token, self._base_payload())

        self.assertEqual(response.status_code, 201, response.get_json())
        body = response.get_json()
        self.assertTrue(body["isCustomVehicle"])
        self.assertEqual(body["vehicle"]["make"], "Suzuki")
        self.assertEqual(body["consumptionSource"], "custom")

        with self.app.app_context():
            trip = Trip.query.get(body["id"])
            self.assertIsNone(trip.vehicle_id)
            self.assertEqual(trip.brand, "Suzuki")
            self.assertEqual(trip.fuel_type, "gasoline")
            # total_weight = pasajeros*75 + carga: 2*75 + 15 = 165
            self.assertAlmostEqual(trip.total_weight, 165.0)

    def test_custom_vehicle_diesel_succeeds(self):
        client = self.app.test_client()
        token, _ = self._register(client, "custom-diesel@example.com")

        payload = self._base_payload(
            custom_vehicle={
                "brand": "Chevrolet", "model": "N300", "year": 2015, "fuel_type": "diesel",
            }
        )
        response = self._calculate(client, token, payload)

        self.assertEqual(response.status_code, 201, response.get_json())
        self.assertEqual(response.get_json()["vehicle"]["fuel_type"], "diesel")

    def test_kml_and_l100km_are_numerically_equivalent(self):
        client = self.app.test_client()
        token_a, _ = self._register(client, "unit-kml@example.com")
        token_b, _ = self._register(client, "unit-l100@example.com")

        response_kml = self._calculate(
            client, token_a,
            self._base_payload(consumption_unit="kml", consumption_value=8.0),
        )
        response_l100 = self._calculate(
            client, token_b,
            # 100 / 12.5 = 8.0 km/L -> debe dar el mismo resultado que arriba
            self._base_payload(consumption_unit="l100km", consumption_value=12.5),
        )

        self.assertEqual(response_kml.status_code, 201)
        self.assertEqual(response_l100.status_code, 201)
        self.assertAlmostEqual(
            response_kml.get_json()["baseFC"],
            response_l100.get_json()["baseFC"],
            places=2,
        )

    # ------------------------------------------------------------------
    # Validación del vehículo
    # ------------------------------------------------------------------

    def test_empty_brand_is_rejected(self):
        client = self.app.test_client()
        token, _ = self._register(client, "empty-brand@example.com")
        payload = self._base_payload(
            custom_vehicle={"brand": "  ", "model": "X", "year": 2010, "fuel_type": "gasoline"}
        )
        response = self._calculate(client, token, payload)
        self.assertEqual(response.status_code, 400)

    def test_excessively_long_model_is_rejected(self):
        client = self.app.test_client()
        token, _ = self._register(client, "long-model@example.com")
        payload = self._base_payload(
            custom_vehicle={
                "brand": "Suzuki", "model": "X" * 200, "year": 2010, "fuel_type": "gasoline",
            }
        )
        response = self._calculate(client, token, payload)
        self.assertEqual(response.status_code, 400)

    def test_invalid_year_is_rejected(self):
        client = self.app.test_client()
        token, _ = self._register(client, "bad-year@example.com")
        for bad_year in (1800, 3000, "abc"):
            with self.subTest(bad_year=bad_year):
                payload = self._base_payload(
                    custom_vehicle={
                        "brand": "Suzuki", "model": "Mastervan",
                        "year": bad_year, "fuel_type": "gasoline",
                    }
                )
                response = self._calculate(client, token, payload)
                self.assertEqual(response.status_code, 400)

    def test_disallowed_fuel_type_is_rejected(self):
        client = self.app.test_client()
        token, _ = self._register(client, "bad-fuel@example.com")
        for fuel_type in ("electric", "hybrid", "kerosene", ""):
            with self.subTest(fuel_type=fuel_type):
                payload = self._base_payload(
                    custom_vehicle={
                        "brand": "Suzuki", "model": "Mastervan",
                        "year": 2000, "fuel_type": fuel_type,
                    }
                )
                response = self._calculate(client, token, payload)
                self.assertEqual(response.status_code, 400)

    # ------------------------------------------------------------------
    # Validación del consumo
    # ------------------------------------------------------------------

    def test_missing_consumption_value_is_rejected(self):
        client = self.app.test_client()
        token, _ = self._register(client, "missing-consumption@example.com")
        payload = self._base_payload()
        del payload["consumption_value"]
        response = self._calculate(client, token, payload)
        self.assertEqual(response.status_code, 400)

    def test_out_of_range_consumption_is_rejected(self):
        client = self.app.test_client()
        token, _ = self._register(client, "range-consumption@example.com")
        for value in (0, -5, 1.9, 40.1, 500):
            with self.subTest(value=value):
                response = self._calculate(
                    client, token, self._base_payload(consumption_value=value)
                )
                self.assertEqual(response.status_code, 400)

    def test_non_finite_consumption_is_rejected(self):
        client = self.app.test_client()
        token, _ = self._register(client, "nonfinite-consumption@example.com")
        for value in (float("nan"), float("inf"), float("-inf")):
            with self.subTest(value=value):
                response = self._calculate(
                    client, token, self._base_payload(consumption_value=value)
                )
                self.assertEqual(response.status_code, 400)

    def test_malformed_consumption_value_is_rejected(self):
        client = self.app.test_client()
        token, _ = self._register(client, "malformed-consumption@example.com")
        response = self._calculate(
            client, token, self._base_payload(consumption_value="not-a-number")
        )
        self.assertEqual(response.status_code, 400)

    def test_unknown_consumption_unit_is_rejected(self):
        client = self.app.test_client()
        token, _ = self._register(client, "unknown-unit@example.com")
        response = self._calculate(
            client, token, self._base_payload(consumption_unit="mpg")
        )
        self.assertEqual(response.status_code, 400)

    def test_l100km_division_by_zero_is_rejected_not_crashed(self):
        client = self.app.test_client()
        token, _ = self._register(client, "zero-l100@example.com")
        response = self._calculate(
            client, token,
            self._base_payload(consumption_unit="l100km", consumption_value=0),
        )
        self.assertEqual(response.status_code, 400)

    def test_standard_mode_is_rejected_for_custom_vehicle(self):
        client = self.app.test_client()
        token, _ = self._register(client, "standard-mode@example.com")
        payload = self._base_payload(consumption_mode="standard")
        response = self._calculate(client, token, payload)
        self.assertEqual(response.status_code, 400)

    # ------------------------------------------------------------------
    # Seguridad: identificadores internos ignorados
    # ------------------------------------------------------------------

    def test_client_supplied_ids_are_ignored(self):
        client = self.app.test_client()
        token, real_user_id = self._register(client, "spoof-ids@example.com")

        payload = self._base_payload(user_id=999999, vehicle_id=999999)
        response = self._calculate(client, token, payload)

        self.assertEqual(response.status_code, 201, response.get_json())
        with self.app.app_context():
            trip = Trip.query.get(response.get_json()["id"])
            self.assertEqual(trip.user_id, real_user_id)
            self.assertIsNone(trip.vehicle_id)

    # ------------------------------------------------------------------
    # Persistencia y aislamiento
    # ------------------------------------------------------------------

    def test_no_vehicle_or_uservehicle_rows_are_created(self):
        client = self.app.test_client()
        token, _ = self._register(client, "no-catalog-pollution@example.com")

        with self.app.app_context():
            vehicles_before = Vehicle.query.count()
            user_vehicles_before = UserVehicle.query.count()

        response = self._calculate(client, token, self._base_payload())
        self.assertEqual(response.status_code, 201)

        with self.app.app_context():
            self.assertEqual(Vehicle.query.count(), vehicles_before)
            self.assertEqual(UserVehicle.query.count(), user_vehicles_before)

    def test_history_is_isolated_between_users(self):
        client = self.app.test_client()
        token_a, _ = self._register(client, "history-a@example.com")
        token_b, _ = self._register(client, "history-b@example.com")

        response = self._calculate(client, token_a, self._base_payload())
        trip_id = response.get_json()["id"]

        own_history = client.get(
            "/api/trips", headers={"Authorization": f"Bearer {token_a}"}
        ).get_json()
        self.assertTrue(any(t["id"] == trip_id for t in own_history))

        other_history = client.get(
            "/api/trips", headers={"Authorization": f"Bearer {token_b}"}
        ).get_json()
        self.assertFalse(any(t["id"] == trip_id for t in other_history))

    def test_custom_vehicle_trip_can_be_deleted(self):
        client = self.app.test_client()
        token, _ = self._register(client, "delete-custom@example.com")

        trip_id = self._calculate(client, token, self._base_payload()).get_json()["id"]

        delete_response = client.delete(
            f"/api/trips/{trip_id}", headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(delete_response.status_code, 200)

        with self.app.app_context():
            self.assertIsNone(Trip.query.get(trip_id))

    # ------------------------------------------------------------------
    # Regresión: el flujo de catálogo existente sigue intacto
    # ------------------------------------------------------------------

    def test_catalog_vehicle_flow_is_unaffected(self):
        with self.app.app_context():
            vehicle = Vehicle(
                make="Chevrolet", model="Spark", year=2021,
                fuel_type="gasoline", weight_kg=1200, lkm_mixed=6.5, lkm_highway=5.2,
            )
            db.session.add(vehicle)
            db.session.commit()

        client = self.app.test_client()
        token, _ = self._register(client, "catalog-regression@example.com")

        payload = {
            "brand": "chevrolet", "model": "spark", "year": 2021,
            "origin": {"lat": -33.45, "lng": -70.66},
            "destination": {"lat": -33.03, "lng": -71.55},
            "origin_label": "Santiago", "destination_label": "Valparaíso",
            "route_polyline": self._sample_polyline(),
            "passengers": 1, "extra_weight": 0, "fuel_price": 1250,
            "road_profile": "mixed", "driving_style": "moderate",
        }
        response = self._calculate(client, token, payload)

        self.assertEqual(response.status_code, 201, response.get_json())
        body = response.get_json()
        self.assertFalse(body["isCustomVehicle"])
        self.assertEqual(body["vehicle"]["make"], "Chevrolet")

        with self.app.app_context():
            trip = Trip.query.get(body["id"])
            self.assertIsNotNone(trip.vehicle_id)
            self.assertTrue(
                UserVehicle.query.filter_by(
                    user_id=trip.user_id, vehicle_id=trip.vehicle_id
                ).first()
            )


if __name__ == "__main__":
    unittest.main()
