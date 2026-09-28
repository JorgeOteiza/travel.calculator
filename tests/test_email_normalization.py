"""Checkpoint B -- normalización y unicidad coherente de email.

Cubre normalize_email(), register/login con distintas capitalizaciones, el
constructor de User, y el CheckConstraint de canonicalización a nivel de
esquema. Mismo patrón de SQLite en memoria que el resto de la suite -- no
toca ninguna base PostgreSQL local ni Neon.

Las pruebas de la MIGRACIÓN (canonicalización de datos existentes y
detección/aborto ante colisiones) se hicieron aparte, en una base
PostgreSQL local desechable, porque dependen de SQL específico de Postgres
(lower(trim(...)) sobre datos ya insertados) y del propio Alembic -- no
son reproducibles de forma significativa contra SQLite en memoria. Su
resultado se reporta en la entrega de este checkpoint, no en este archivo.
"""
import os
import unittest

os.environ["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-with-at-least-32-bytes"
os.environ["DEBUG"] = "False"

from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app import create_app
from backend.extensions import db
from backend.models import User
from backend.utils.email_utils import normalize_email


class NormalizeEmailFunctionTests(unittest.TestCase):
    def test_lowercases(self):
        self.assertEqual(normalize_email("JORGE@EXAMPLE.COM"), "jorge@example.com")

    def test_strips_external_whitespace(self):
        self.assertEqual(normalize_email("  usuario@example.com  "), "usuario@example.com")

    def test_combined_case_and_whitespace(self):
        self.assertEqual(normalize_email(" Usuario@Gmail.com "), "usuario@gmail.com")

    def test_does_not_alter_internal_characters(self):
        # Solo recorta espacios EXTERNOS y pasa a minúsculas -- nunca toca
        # puntos, signos + u otros caracteres internos del email.
        self.assertEqual(
            normalize_email("Primer.Apellido+tag@Example.COM"),
            "primer.apellido+tag@example.com",
        )

    def test_rejects_non_string_input(self):
        with self.assertRaises(TypeError):
            normalize_email(None)
        with self.assertRaises(TypeError):
            normalize_email(12345)


class UserConstructorNormalizesEmailTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.app.config.update(TESTING=True)

    def setUp(self):
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_constructor_canonicalizes_email(self):
        user = User(name="Code User", email=" USER@Example.com ", password="secure123")
        db.session.add(user)
        db.session.commit()
        self.assertEqual(user.email, "user@example.com")

    def test_direct_noncanonical_insert_violates_check_constraint(self):
        # Insert SQL directo que evita normalize_email() por completo --
        # debe fallar por el CheckConstraint del esquema, no por Python.
        with self.assertRaises(IntegrityError):
            db.session.execute(text(
                "INSERT INTO \"user\" "
                "(name, email, password, session_version, email_verified) "
                "VALUES ('Raw', 'NoCanonico@Example.com', 'x', 0, 0)"
            ))
            db.session.commit()
        db.session.rollback()

    def test_direct_empty_email_insert_violates_check_constraint(self):
        # El CHECK ahora también exige email <> '', no solo la forma
        # canónica -- un insert directo con email='' debe fallar en la DB.
        with self.assertRaises(IntegrityError):
            db.session.execute(text(
                "INSERT INTO \"user\" "
                "(name, email, password, session_version, email_verified) "
                "VALUES ('Raw', '', 'x', 0, 0)"
            ))
            db.session.commit()
        db.session.rollback()


class RegisterLoginNormalizationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.app.config.update(TESTING=True)
        with cls.app.app_context():
            db.create_all()

    def test_register_stores_lowercase_trimmed_email(self):
        client = self.app.test_client()
        response = client.post("/api/register", json={
            "name": "Case Test", "email": "  Usuario@Gmail.com  ", "password": "secure123",
        })
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json()["user"]["email"], "usuario@gmail.com")

    def test_second_register_with_different_case_is_rejected_as_duplicate(self):
        client = self.app.test_client()
        first = client.post("/api/register", json={
            "name": "Original", "email": "duplicado@example.com", "password": "secure123",
        })
        self.assertEqual(first.status_code, 201)

        second = client.post("/api/register", json={
            "name": "Otro", "email": "DUPLICADO@Example.com", "password": "secure456",
        })
        self.assertEqual(second.status_code, 409)

    def test_login_succeeds_with_different_capitalization(self):
        client = self.app.test_client()
        register = client.post("/api/register", json={
            "name": "Login Case", "email": "logincase@example.com", "password": "secure123",
        })
        self.assertEqual(register.status_code, 201)

        login = client.post("/api/login", json={
            "email": "  LoginCase@EXAMPLE.com  ", "password": "secure123",
        })
        self.assertEqual(login.status_code, 200)
        self.assertIn("jwt", login.get_json())
        self.assertEqual(login.get_json()["user"]["email"], "logincase@example.com")

    def test_login_still_rejects_wrong_password_after_normalization(self):
        client = self.app.test_client()
        client.post("/api/register", json={
            "name": "Wrong Pass", "email": "wrongpass@example.com", "password": "secure123",
        })
        login = client.post("/api/login", json={
            "email": "WrongPass@Example.com", "password": "incorrecta",
        })
        self.assertEqual(login.status_code, 401)


class InvalidEmailInputTests(unittest.TestCase):
    """Register/login ante email whitespace-only o de tipo no string --
    deben responder 4xx controlado, nunca 500 ni una excepción sin
    capturar."""

    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.app.config.update(TESTING=True)
        with cls.app.app_context():
            db.create_all()

    def test_register_rejects_whitespace_only_email(self):
        client = self.app.test_client()
        response = client.post("/api/register", json={
            "name": "Whitespace", "email": "   ", "password": "secure123",
        })
        self.assertEqual(response.status_code, 400)

    def test_register_rejects_non_string_email(self):
        client = self.app.test_client()
        for bad_email in (12345, ["test@example.com"]):
            response = client.post("/api/register", json={
                "name": "Bad Type", "email": bad_email, "password": "secure123",
            })
            self.assertEqual(response.status_code, 400, f"email={bad_email!r}")

    def test_register_trims_and_stores_correctly(self):
        client = self.app.test_client()
        response = client.post("/api/register", json={
            "name": "Trim Me", "email": " TRIMME@example.com ", "password": "secure123",
        })
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json()["user"]["email"], "trimme@example.com")

    def test_login_rejects_whitespace_only_email(self):
        client = self.app.test_client()
        response = client.post("/api/login", json={
            "email": "   ", "password": "secure123",
        })
        self.assertEqual(response.status_code, 400)

    def test_login_rejects_non_string_email(self):
        client = self.app.test_client()
        for bad_email in (12345, ["test@example.com"]):
            response = client.post("/api/login", json={
                "email": bad_email, "password": "secure123",
            })
            self.assertEqual(response.status_code, 400, f"email={bad_email!r}")

    def test_login_authenticates_with_trimmed_uppercase_email(self):
        client = self.app.test_client()
        client.post("/api/register", json={
            "name": "Upper Login", "email": "user@example.com", "password": "secure123",
        })
        response = client.post("/api/login", json={
            "email": " USER@EXAMPLE.COM ", "password": "secure123",
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["user"]["email"], "user@example.com")


if __name__ == "__main__":
    unittest.main()
