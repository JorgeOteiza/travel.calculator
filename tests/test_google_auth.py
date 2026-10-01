"""Pruebas de /api/google-nonce y /api/google-login (Sign in with Google).

No se mockea únicamente el verificador devolviendo claims "felices": varias
pruebas fuerzan errores reales (firma/estado inválidos, GoogleTokenError,
IntegrityError real en commit()) para comprobar también el manejo de esos
errores, no solo el camino exitoso, y que ningún dato se escribe cuando la
petición es rechazada.

Los tests de IntegrityError (clase GoogleAuthIntegrityErrorRecoveryTests)
prueban la POLÍTICA DE RECUPERACIÓN post-rollback del código (qué hace la
ruta cuando commit() falla y tiene que re-consultar), mediante mocks
controlados de las dos re-consultas -- NO simulan concurrencia real de
PostgreSQL, que SQLite en memoria no puede proveer de forma fiel (una sola
conexión física compartida, StaticPool).
"""
import os
import unittest
from unittest.mock import patch, MagicMock

os.environ["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-with-at-least-32-bytes"
os.environ["DEBUG"] = "False"
os.environ["GOOGLE_CLIENT_ID"] = "test-client-id.apps.googleusercontent.com"

from sqlalchemy.exc import IntegrityError
from flask_jwt_extended import decode_token
from google.auth import exceptions as google_auth_exceptions

from app import create_app
from backend.extensions import db
from backend.models import User, AuthIdentity
from backend.utils.google_auth import verify_google_id_token, GoogleTokenError
import backend.utils.google_auth as google_auth_module
import backend.routes.auth_routes as auth_routes


def _claims(**overrides):
    base = {
        "sub": "google-sub-1",
        "email": "nuevo@example.com",
        "email_verified": True,
        "name": "Usuario Nuevo",
    }
    base.update(overrides)
    return base


class GoogleAuthTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.app.config.update(TESTING=True)

    _next_ip = 1

    def setUp(self):
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()
        self.client = self.app.test_client()
        # El limiter de Flask-Limiter es por IP y comparte estado entre
        # pruebas de esta clase (misma app, mismo almacenamiento en
        # memoria) -- cada prueba usa su propia IP falsa para no chocar
        # con el límite de otra, mismo patrón que
        # tests/test_backend.py::test_login_is_rate_limited.
        GoogleAuthTests._next_ip += 1
        self._environ = {"REMOTE_ADDR": f"203.0.113.{GoogleAuthTests._next_ip}"}

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def _get_nonce(self):
        response = self.client.get("/api/google-nonce", environ_overrides=self._environ)
        self.assertEqual(response.status_code, 200)
        return response.get_json()

    def _post_google_login(self, claims, state):
        with patch.object(auth_routes, "verify_google_id_token", return_value=claims):
            return self.client.post(
                "/api/google-login",
                json={
                    "credential": "fake-credential-not-inspected-because-mocked",
                    "state": state,
                },
                environ_overrides=self._environ,
            )

    # --- disponibilidad sin GOOGLE_CLIENT_ID ---

    def test_routes_disabled_cleanly_without_client_id(self):
        with patch.dict(self.app.config, {"GOOGLE_CLIENT_ID": None}):
            nonce_resp = self.client.get("/api/google-nonce", environ_overrides=self._environ)
            login_resp = self.client.post(
                "/api/google-login",
                json={"credential": "x", "state": "y"},
                environ_overrides=self._environ,
            )
        self.assertEqual(nonce_resp.status_code, 503)
        self.assertEqual(login_resp.status_code, 503)
        self.assertEqual(User.query.count(), 0)

    # --- nonce/state: validación de la petición antes de tocar Google ---

    def test_google_login_missing_credential_returns_400(self):
        state = self._get_nonce()["state"]
        response = self.client.post(
            "/api/google-login", json={"state": state}, environ_overrides=self._environ
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(User.query.count(), 0)

    def test_google_login_missing_state_returns_401(self):
        response = self.client.post(
            "/api/google-login", json={"credential": "algo"}, environ_overrides=self._environ
        )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(User.query.count(), 0)

    def test_google_login_tampered_state_is_rejected(self):
        state = self._get_nonce()["state"]
        tampered = state[:-1] + ("a" if state[-1] != "a" else "b")
        response = self._post_google_login(_claims(nonce="no-importa"), tampered)
        self.assertEqual(response.status_code, 401)
        self.assertEqual(User.query.count(), 0)

    def test_google_login_expired_state_is_rejected(self):
        state = self._get_nonce()["state"]
        with patch.object(auth_routes, "GOOGLE_NONCE_MAX_AGE_SECONDS", -1):
            response = self._post_google_login(_claims(nonce="lo-que-sea"), state)
        self.assertEqual(response.status_code, 401)
        self.assertEqual(User.query.count(), 0)

    def test_google_login_nonce_mismatch_is_rejected_and_writes_nothing(self):
        state = self._get_nonce()["state"]
        response = self._post_google_login(_claims(nonce="nonce-incorrecto"), state)
        self.assertEqual(response.status_code, 401)
        self.assertEqual(User.query.count(), 0)
        self.assertEqual(AuthIdentity.query.count(), 0)

    def test_google_login_missing_nonce_claim_is_rejected_and_writes_nothing(self):
        # Caso distinto de "nonce incorrecto": aquí los claims verificados
        # son válidos en todo lo demás, pero la clave "nonce" NO existe en
        # absoluto (no un valor equivocado). _claims() sin override de
        # "nonce" no la incluye -- ver la función helper arriba.
        state = self._get_nonce()["state"]
        claims_without_nonce = _claims()
        self.assertNotIn("nonce", claims_without_nonce)
        response = self._post_google_login(claims_without_nonce, state)
        self.assertEqual(response.status_code, 401)
        self.assertEqual(User.query.count(), 0)
        self.assertEqual(AuthIdentity.query.count(), 0)

    # --- fallo real de verificación del token (no solo claims felices) ---

    def test_google_login_token_verification_error_is_handled_and_writes_nothing(self):
        nonce = self._get_nonce()
        with patch.object(
            auth_routes, "verify_google_id_token",
            side_effect=GoogleTokenError("No se pudo verificar la cuenta de Google."),
        ):
            response = self.client.post(
                "/api/google-login",
                json={"credential": "credencial-invalida", "state": nonce["state"]},
                environ_overrides=self._environ,
            )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(User.query.count(), 0)

    # --- caso (b): cuenta nueva ---

    def test_google_login_creates_new_user_when_email_verified(self):
        nonce = self._get_nonce()
        response = self._post_google_login(_claims(nonce=nonce["nonce"]), nonce["state"])
        self.assertEqual(response.status_code, 201)
        body = response.get_json()
        self.assertIn("jwt", body)

        user = User.query.filter_by(email="nuevo@example.com").first()
        self.assertIsNotNone(user)
        self.assertIsNone(user.password)
        self.assertTrue(user.email_verified)
        self.assertIsNotNone(user.email_verified_at)

        identity = AuthIdentity.query.filter_by(provider="google", provider_subject="google-sub-1").first()
        self.assertIsNotNone(identity)
        self.assertEqual(identity.user_id, user.id)
        self.assertTrue(identity.provider_email_verified)

    def test_google_login_jwt_is_real_flask_jwt_extended_token_and_authorizes_protected_route(self):
        """Demuestra que Google solo autentica identidad inicial: el JWT
        que emite es exactamente el mismo tipo de token interno que ya
        usa el login por contraseña, y /api/user lo acepta por la vía
        normal de autorización, sin ningún atajo especial para Google.
        decode_token() verifica firma/expiración de verdad (no se salta
        nada) -- no imprime el token en ningún momento."""
        nonce = self._get_nonce()
        response = self._post_google_login(_claims(nonce=nonce["nonce"]), nonce["state"])
        self.assertEqual(response.status_code, 201)
        body = response.get_json()
        token = body["jwt"]
        user_id = body["user"]["id"]

        decoded = decode_token(token)
        user = db.session.get(User, user_id)
        self.assertEqual(decoded["sub"], str(user.id))
        self.assertEqual(decoded["ver"], user.session_version)

        protected = self.client.get(
            "/api/user",
            headers={"Authorization": f"Bearer {token}"},
            environ_overrides=self._environ,
        )
        self.assertEqual(protected.status_code, 200)
        self.assertEqual(protected.get_json()["id"], user_id)

    def test_google_login_rejects_new_account_when_email_not_verified(self):
        nonce = self._get_nonce()
        response = self._post_google_login(
            _claims(nonce=nonce["nonce"], email_verified=False), nonce["state"]
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(User.query.count(), 0)

    def test_google_login_rejects_new_account_without_email(self):
        nonce = self._get_nonce()
        response = self._post_google_login(
            _claims(nonce=nonce["nonce"], email=None), nonce["state"]
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(User.query.count(), 0)

    # --- caso (a): identidad ya vinculada ---

    def test_google_login_existing_identity_logs_in_same_user(self):
        nonce = self._get_nonce()
        first = self._post_google_login(_claims(nonce=nonce["nonce"]), nonce["state"])
        first_user_id = first.get_json()["user"]["id"]

        nonce2 = self._get_nonce()
        second = self._post_google_login(_claims(nonce=nonce2["nonce"]), nonce2["state"])
        self.assertEqual(second.status_code, 200)
        self.assertEqual(second.get_json()["user"]["id"], first_user_id)

        self.assertEqual(User.query.count(), 1)
        self.assertEqual(AuthIdentity.query.count(), 1)

    def test_google_login_does_not_overwrite_local_email_on_returning_login(self):
        nonce = self._get_nonce()
        self._post_google_login(_claims(nonce=nonce["nonce"], email="original@example.com"), nonce["state"])
        user_before = User.query.filter_by(email="original@example.com").first()
        self.assertIsNotNone(user_before)

        nonce2 = self._get_nonce()
        self._post_google_login(
            _claims(nonce=nonce2["nonce"], email="cambiado-en-google@example.com"),
            nonce2["state"],
        )

        user_after = db.session.get(User, user_before.id)
        self.assertEqual(user_after.email, "original@example.com")

        identity = AuthIdentity.query.filter_by(provider_subject="google-sub-1").first()
        self.assertEqual(identity.provider_email, "cambiado-en-google@example.com")

    # --- caso (c): conflicto de email, sin auto-vinculación ---

    def test_google_login_does_not_auto_link_existing_password_account(self):
        existing = User(name="Cuenta con contraseña", email="colision@example.com", password="secure123")
        db.session.add(existing)
        db.session.commit()
        existing_id = existing.id

        nonce = self._get_nonce()
        response = self._post_google_login(
            _claims(nonce=nonce["nonce"], email="colision@example.com", sub="google-sub-2"),
            nonce["state"],
        )

        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.get_json().get("code"), "email_conflict")
        self.assertEqual(User.query.count(), 1)
        self.assertEqual(AuthIdentity.query.count(), 0)

        untouched = db.session.get(User, existing_id)
        self.assertTrue(untouched.check_password("secure123"))

    # --- IntegrityError: política de recuperación post-rollback, con
    # mocks controlados -- NO simula concurrencia real de PostgreSQL (ver
    # nota al inicio del archivo). ---

    def test_google_login_integrity_error_with_no_recoverable_row_returns_controlled_error(self):
        """Caso base: commit() falla con IntegrityError y NINGUNA de las
        dos re-consultas encuentra nada (ni AuthIdentity ni User en
        conflicto) -- la ruta no debe inventar una resolución, solo
        responder con un error controlado, sin dejar un User a medio
        crear."""
        nonce = self._get_nonce()

        with patch.object(auth_routes, "verify_google_id_token", return_value=_claims(nonce=nonce["nonce"])), \
             patch.object(
                 db.session, "commit",
                 side_effect=IntegrityError("simulated unique violation", params=None, orig=Exception("UNIQUE constraint failed")),
             ):
            response = self.client.post(
                "/api/google-login",
                json={"credential": "fake-credential", "state": nonce["state"]},
                environ_overrides=self._environ,
            )

        self.assertIn(response.status_code, (409, 500))
        self.assertEqual(User.query.count(), 0)
        self.assertEqual(AuthIdentity.query.count(), 0)

    def test_google_login_integrity_error_retry_finds_existing_identity_logs_in(self):
        """Caso A (POLÍTICA DE RECUPERACIÓN, no concurrencia real): se
        mockea AuthIdentity.query para que la PRIMERA llamada (el chequeo
        inicial de la ruta) devuelva None -- así se entra al bloque de
        creación -- y la SEGUNDA llamada (la re-consulta dentro del
        except IntegrityError) devuelva una identidad ya vinculada a un
        User real y ya persistido, simulando que 'otra petición' terminó
        de crearla justo antes de que esta comiteara. Se espera login
        exitoso a la cuenta EXISTENTE, sin 500 y sin User residual nuevo."""
        winner_user = User(name="Ganador de la carrera", email="ganador-carrera@example.com", password=None)
        db.session.add(winner_user)
        db.session.commit()
        winner_identity = AuthIdentity(
            user_id=winner_user.id, provider="google", provider_subject="race-sub-a",
        )
        db.session.add(winner_identity)
        db.session.commit()
        winner_user_id = winner_user.id

        nonce = self._get_nonce()

        mock_identity_query = MagicMock()
        mock_identity_query.filter_by.return_value.first.side_effect = [None, winner_identity]

        with patch.object(
                 auth_routes, "verify_google_id_token",
                 return_value=_claims(nonce=nonce["nonce"], sub="race-sub-a", email="alguien-nuevo@example.com"),
             ), \
             patch.object(AuthIdentity, "query", mock_identity_query), \
             patch.object(
                 db.session, "commit",
                 side_effect=IntegrityError("simulated unique violation on auth_identity", params=None, orig=Exception("UNIQUE constraint failed")),
             ):
            response = self.client.post(
                "/api/google-login",
                json={"credential": "fake-credential", "state": nonce["state"]},
                environ_overrides=self._environ,
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["user"]["id"], winner_user_id)
        self.assertIn("jwt", response.get_json())
        # Ningún User nuevo quedó residual -- sigue existiendo solo el
        # "ganador" que ya estaba antes de la petición.
        self.assertEqual(User.query.count(), 1)
        self.assertEqual(User.query.filter_by(email="alguien-nuevo@example.com").count(), 0)

    def test_google_login_integrity_error_retry_finds_only_email_conflict_returns_409(self):
        """Caso B (POLÍTICA DE RECUPERACIÓN, no concurrencia real): se
        mockea AuthIdentity.query para que NUNCA encuentre nada (ni en el
        chequeo inicial ni en la re-consulta -- no hay identidad de
        Google en conflicto), y User.query para que la re-consulta dentro
        del except SÍ encuentre una cuenta existente con el mismo email
        (simulando que 'otra petición' registró ese email justo antes).
        Se espera 409 con code=email_conflict, SIN login, SIN JWT, SIN
        AuthIdentity creada y sin User residual nuevo."""
        conflicting_user = User(name="Ya registrado", email="conflicto-carrera@example.com", password="secure123")
        db.session.add(conflicting_user)
        db.session.commit()
        conflicting_user_id = conflicting_user.id

        nonce = self._get_nonce()

        mock_identity_query = MagicMock()
        mock_identity_query.filter_by.return_value.first.side_effect = [None, None]

        mock_user_query = MagicMock()
        mock_user_query.filter_by.return_value.first.side_effect = [None, conflicting_user]

        with patch.object(
                 auth_routes, "verify_google_id_token",
                 return_value=_claims(nonce=nonce["nonce"], sub="race-sub-b", email="conflicto-carrera@example.com"),
             ), \
             patch.object(AuthIdentity, "query", mock_identity_query), \
             patch.object(User, "query", mock_user_query), \
             patch.object(
                 db.session, "commit",
                 side_effect=IntegrityError("simulated unique violation on user.email", params=None, orig=Exception("UNIQUE constraint failed")),
             ):
            response = self.client.post(
                "/api/google-login",
                json={"credential": "fake-credential", "state": nonce["state"]},
                environ_overrides=self._environ,
            )

        self.assertEqual(response.status_code, 409)
        body = response.get_json()
        self.assertEqual(body.get("code"), "email_conflict")
        self.assertNotIn("jwt", body)

        # User.query está mockeado dentro del "with" -- se verifica el
        # estado REAL de la base ya fuera de él, sin el mock activo.
        self.assertEqual(User.query.count(), 1)
        self.assertEqual(AuthIdentity.query.count(), 0)
        untouched = db.session.get(User, conflicting_user_id)
        self.assertTrue(untouched.check_password("secure123"))

    # --- regresión: cuenta solo-Google no puede loguearse por contraseña ---

    def test_google_only_account_cannot_login_with_password(self):
        nonce = self._get_nonce()
        self._post_google_login(_claims(nonce=nonce["nonce"]), nonce["state"])

        response = self.client.post(
            "/api/login",
            json={"email": "nuevo@example.com", "password": "cualquier-cosa"},
            environ_overrides=self._environ,
        )
        self.assertEqual(response.status_code, 401)


class GoogleTokenVerificationWrapperTests(unittest.TestCase):
    """Prueba EXCLUSIVAMENTE que backend.utils.google_auth.verify_google_id_token
    traduce a GoogleTokenError los errores que la librería real google-auth
    levanta ante un 'aud' o un 'iss' incorrectos -- no reimplementa ni
    vuelve a probar criptográficamente la verificación de google-auth en
    sí (eso ya está cubierto por la propia librería, confirmado leyendo su
    código fuente durante la fase de diseño). No necesita app Flask ni DB:
    es una prueba directa de la función, sin pasar por ninguna ruta."""

    def test_wraps_audience_mismatch_as_google_token_error(self):
        # google.auth.jwt.decode (usado internamente por verify_oauth2_token)
        # levanta ValueError cuando 'aud' no coincide con lo esperado.
        with patch.object(
            google_auth_module.google_id_token, "verify_oauth2_token",
            side_effect=ValueError("Token has wrong audience aud: expected another-client-id, got mi-client-id"),
        ):
            with self.assertRaises(GoogleTokenError):
                verify_google_id_token("token-cualquiera", audience="mi-client-id")

    def test_wraps_issuer_mismatch_as_google_token_error(self):
        # verify_oauth2_token levanta GoogleAuthError cuando 'iss' no es
        # accounts.google.com / https://accounts.google.com (confirmado
        # leyendo el código fuente real de la librería).
        with patch.object(
            google_auth_module.google_id_token, "verify_oauth2_token",
            side_effect=google_auth_exceptions.GoogleAuthError(
                "Wrong issuer. 'iss' should be one of the following: "
                "['accounts.google.com', 'https://accounts.google.com']"
            ),
        ):
            with self.assertRaises(GoogleTokenError):
                verify_google_id_token("token-cualquiera", audience="mi-client-id")

    def test_never_returns_claims_on_verification_failure(self):
        # No basta con que levante la excepción correcta -- confirma
        # también que, ante el error, la función NUNCA llega a devolver
        # un diccionario de claims (ni parcial ni completo).
        with patch.object(
            google_auth_module.google_id_token, "verify_oauth2_token",
            side_effect=ValueError("Wrong recipient"),
        ):
            try:
                result = verify_google_id_token("token-cualquiera", audience="mi-client-id")
            except GoogleTokenError:
                result = "NO_CLAIMS_RETURNED"
        self.assertEqual(result, "NO_CLAIMS_RETURNED")


if __name__ == "__main__":
    unittest.main()
