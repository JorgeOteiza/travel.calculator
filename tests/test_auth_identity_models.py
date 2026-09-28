"""Checkpoint A -- pruebas del modelo preparatorio para identidad
multi-proveedor y verificación de correo. Aísla estos modelos del resto de
la suite (mismo patrón de SQLite en memoria que tests/test_backend.py) para
poder ejecutarse sin tocar ninguna base PostgreSQL local ni Neon.

No prueba ningún endpoint nuevo porque este checkpoint no agrega ninguno --
solo el esquema. register()/login() ya están cubiertos por
tests/test_backend.py y se confirmó ahí que siguen pasando sin cambios.
"""
import os
import unittest

os.environ["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-with-at-least-32-bytes"
os.environ["DEBUG"] = "False"

from sqlalchemy.exc import IntegrityError

from app import create_app
from backend.extensions import db
from backend.models import User, AuthIdentity, VerificationToken


class AuthIdentityModelTests(unittest.TestCase):
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

    def _make_user(self, email="user@example.com", password="secure123"):
        user = User(name="Test User", email=email, password=password)
        db.session.add(user)
        db.session.commit()
        return user

    # --- User: contraseña sigue exigida por el flujo tradicional ---

    def test_set_password_still_rejects_empty_value(self):
        user = self._make_user()
        with self.assertRaises(ValueError):
            user.set_password("")

    def test_traditional_user_creation_still_requires_password(self):
        with self.assertRaises(ValueError):
            User(name="Sin Password", email="sinpass@example.com", password="")

    def test_password_column_now_accepts_null_at_schema_level(self):
        # Simula lo que hará un futuro usuario solo-Google: no se llama a
        # set_password(), se asigna None directamente a nivel de columna.
        user = User(name="Solo Google", email="google-user@example.com", password="temp123")
        user.password = None
        db.session.add(user)
        db.session.commit()
        fetched = db.session.get(User, user.id)
        self.assertIsNone(fetched.password)

    # --- email_verified ---

    def test_email_verified_defaults_to_false_for_new_user(self):
        user = self._make_user()
        self.assertFalse(user.email_verified)
        self.assertIsNone(user.email_verified_at)

    def test_email_verified_does_not_block_login_flow_at_model_level(self):
        # No hay gate todavía: un usuario con email_verified=False debe
        # poder autenticar igual (lo prueba check_password, que es lo que
        # usa /api/login).
        user = self._make_user(password="secure123")
        self.assertFalse(user.email_verified)
        self.assertTrue(user.check_password("secure123"))

    # --- AuthIdentity ---

    def test_auth_identity_unique_provider_subject(self):
        user_a = self._make_user(email="a@example.com")
        user_b = self._make_user(email="b@example.com")
        db.session.add(AuthIdentity(
            user_id=user_a.id, provider="google", provider_subject="sub-123",
        ))
        db.session.commit()

        db.session.add(AuthIdentity(
            user_id=user_b.id, provider="google", provider_subject="sub-123",
        ))
        with self.assertRaises(IntegrityError):
            db.session.commit()
        db.session.rollback()

    def test_user_can_have_multiple_identities_different_provider_or_subject(self):
        user = self._make_user()
        db.session.add(AuthIdentity(
            user_id=user.id, provider="google", provider_subject="sub-1",
        ))
        db.session.add(AuthIdentity(
            user_id=user.id, provider="google", provider_subject="sub-2",
        ))
        db.session.commit()

        identities = AuthIdentity.query.filter_by(user_id=user.id).all()
        self.assertEqual(len(identities), 2)

    def test_auth_identity_provider_email_verified_defaults_false(self):
        user = self._make_user()
        identity = AuthIdentity(user_id=user.id, provider="google", provider_subject="sub-x")
        db.session.add(identity)
        db.session.commit()
        self.assertFalse(identity.provider_email_verified)
        self.assertIsNone(identity.provider_email)

    def test_deleting_user_cascades_to_auth_identity_via_orm(self):
        user = self._make_user()
        db.session.add(AuthIdentity(
            user_id=user.id, provider="google", provider_subject="sub-cascade",
        ))
        db.session.commit()
        user_id = user.id

        db.session.delete(user)
        db.session.commit()

        remaining = AuthIdentity.query.filter_by(user_id=user_id).all()
        self.assertEqual(remaining, [])

    # --- VerificationToken ---

    def test_verification_token_can_be_looked_up_by_hash(self):
        from datetime import UTC, datetime, timedelta
        user = self._make_user()
        token = VerificationToken(
            user_id=user.id,
            token_hash="a" * 64,
            purpose="email_verification",
            expires_at=datetime.now(UTC).replace(tzinfo=None) + timedelta(hours=24),
        )
        db.session.add(token)
        db.session.commit()

        found = VerificationToken.query.filter_by(token_hash="a" * 64).first()
        self.assertIsNotNone(found)
        self.assertEqual(found.user_id, user.id)
        self.assertIsNone(found.used_at)

    def test_deleting_user_cascades_to_verification_token_via_orm(self):
        # Regresión: sin User.verification_tokens (relación "uno" con
        # cascade="all, delete"), eliminar un User con tokens vigentes
        # fallaba por violación de FK -- VerificationToken.user por sí solo
        # no le indica al ORM que debe cascadear el delete.
        from datetime import UTC, datetime, timedelta
        user = self._make_user()
        db.session.add(VerificationToken(
            user_id=user.id, token_hash="b" * 64, purpose="email_verification",
            expires_at=datetime.now(UTC).replace(tzinfo=None) + timedelta(hours=24),
        ))
        db.session.commit()
        user_id = user.id

        db.session.delete(user)
        db.session.commit()

        remaining = VerificationToken.query.filter_by(user_id=user_id).all()
        self.assertEqual(remaining, [])

    def test_verification_token_hash_is_unique(self):
        from datetime import UTC, datetime, timedelta
        user = self._make_user()
        expires = datetime.now(UTC).replace(tzinfo=None) + timedelta(hours=1)
        db.session.add(VerificationToken(
            user_id=user.id, token_hash="dupe" * 16, purpose="email_verification",
            expires_at=expires,
        ))
        db.session.commit()

        db.session.add(VerificationToken(
            user_id=user.id, token_hash="dupe" * 16, purpose="password_reset",
            expires_at=expires,
        ))
        with self.assertRaises(IntegrityError):
            db.session.commit()
        db.session.rollback()


if __name__ == "__main__":
    unittest.main()
