import os
import unittest

os.environ["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-with-at-least-32-bytes"
os.environ["DEBUG"] = "False"

from app import create_app
from backend.extensions import db
from backend.utils.trip_calculation import calculate_fuel_consumption


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


if __name__ == "__main__":
    unittest.main()
