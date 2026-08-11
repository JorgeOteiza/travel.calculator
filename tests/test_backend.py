import os
import unittest
from unittest.mock import Mock, patch

os.environ["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-with-at-least-32-bytes"
os.environ["DEBUG"] = "False"

from app import create_app
from backend.extensions import db
from backend.utils.trip_calculation import (
    calculate_fuel_consumption,
    calculate_trip_from_segments,
)
from backend.services.elevation_profile_chart_service import build_elevation_segments
from backend.services.elevation_profile import get_elevation_for_points
from backend.services.weather_service import get_weather_from_coords


class CalculationTests(unittest.TestCase):
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

    def test_paid_google_backend_routes_are_blocked(self):
        client = self.app.test_client()
        self.assertEqual(client.get("/api/elevation?origin=1,1&destination=2,2").status_code, 403)
        self.assertEqual(client.get("/api/distance?origin=1,1&destination=2,2").status_code, 403)


if __name__ == "__main__":
    unittest.main()
