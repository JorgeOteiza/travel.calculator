import os
import unittest
from datetime import datetime
from unittest.mock import Mock, patch

os.environ["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-with-at-least-32-bytes"
os.environ["DEBUG"] = "False"

from app import create_app
from backend.extensions import db
from backend.models import Vehicle, Trip
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

    def test_jwt_secret_key_required_at_boot(self):
        original = os.environ.pop("JWT_SECRET_KEY", None)
        try:
            with self.assertRaises(RuntimeError):
                create_app()
        finally:
            if original is not None:
                os.environ["JWT_SECRET_KEY"] = original

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


if __name__ == "__main__":
    unittest.main()
