import secrets
from datetime import UTC, datetime
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import (
    create_access_token, jwt_required, get_jwt_identity, get_jwt
)
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from sqlalchemy.exc import IntegrityError
from backend.models import db, User, AuthIdentity, RevokedToken
from backend.extensions import limiter
from backend.utils.email_utils import normalize_email
from backend.utils.google_auth import verify_google_id_token, GoogleTokenError
from functools import wraps

auth_bp = Blueprint('auth_bp', __name__)

# Vigencia del "state" que liga un ID token de Google a la petición de
# nonce que lo originó -- ventana corta a propósito, es solo el tiempo
# entre pedir el nonce y completar el selector de cuentas de Google.
GOOGLE_NONCE_MAX_AGE_SECONDS = 300
GOOGLE_NONCE_SALT = "google-auth-nonce"


def _google_nonce_serializer():
    # Reutiliza JWT_SECRET_KEY (ya es un secreto de aplicación existente)
    # en vez de introducir uno nuevo solo para esto -- el "salt" separa
    # este uso de cualquier otro que itsdangerous pudiera tener en el
    # futuro con la misma clave.
    return URLSafeTimedSerializer(current_app.config["JWT_SECRET_KEY"], salt=GOOGLE_NONCE_SALT)


def _issue_session_response(user, status_code=200, message="Inicio de sesión exitoso"):
    token = create_access_token(
        identity=str(user.id),
        additional_claims={"ver": user.session_version},
    )
    return jsonify({
        "message": message,
        "jwt": token,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
        },
    }), status_code

# Decorador para verificar roles
def role_required(role):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            user_id = get_jwt_identity()
            user = User.query.get(user_id)
            if not user or not user.has_role(role):
                return jsonify({"error": "Acceso denegado"}), 403
            return func(*args, **kwargs)
        return wrapper
    return decorator


@auth_bp.route("/user", methods=["GET"])
@jwt_required()
def get_user():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "Usuario no encontrado"}), 404

    return jsonify({
        "id": user.id,
        "name": user.name,
        "email": user.email
    }), 200


@auth_bp.route("/register", methods=["POST"])
@limiter.limit("5 per minute")
def register():
    try:
        data = request.get_json(silent=True) or {}
        name = data.get("name")
        email = data.get("email")
        password = data.get("password")

        if not all([name, email, password]):
            return jsonify({"error": "Todos los campos son obligatorios"}), 400

        # isinstance ANTES de normalize_email(): la utilidad se mantiene
        # estricta (TypeError ante cualquier no-string) y la validación de
        # lo que puede llegar en un JSON de HTTP -- un email numérico, una
        # lista, etc. -- queda aquí, en la ruta, no mezclada dentro de la
        # utilidad. El chequeo posterior a normalizar cubre el caso de un
        # email compuesto solo por espacios ("   "), que "not all([...])"
        # no detecta porque ese string es truthy antes de recortarlo.
        if not isinstance(email, str):
            return jsonify({"error": "El correo debe ser un texto válido"}), 400

        email = normalize_email(email)
        if not email:
            return jsonify({"error": "El correo no puede estar vacío"}), 400

        if User.query.filter_by(email=email).first():
            return jsonify({"error": "El correo ya está registrado"}), 409

        new_user = User(name=name, email=email, password=password)
        db.session.add(new_user)
        db.session.commit()

        token = create_access_token(
            identity=str(new_user.id),
            additional_claims={"ver": new_user.session_version},
        )

        return jsonify({
            "message": "Usuario registrado con éxito",
            "jwt": token,
            "user": {
                "id": new_user.id,
                "name": new_user.name,
                "email": new_user.email
            }
        }), 201

    except Exception:
        db.session.rollback()
        raise


@auth_bp.route("/login", methods=["POST"])
@limiter.limit("5 per minute")
def login():
    data = request.get_json(silent=True) or {}
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Correo y contraseña son requeridos"}), 400

    if not isinstance(email, str):
        return jsonify({"error": "El correo debe ser un texto válido"}), 400

    email = normalize_email(email)
    if not email:
        return jsonify({"error": "El correo no puede estar vacío"}), 400

    user = User.query.filter_by(email=email).first()

    # user.check_password() (no bcrypt.check_password_hash directo): una
    # cuenta creada solo por un proveedor externo (Google) tiene
    # password=None, y bcrypt.check_password_hash(None, ...) revienta con
    # TypeError -- check_password() ya maneja ese caso devolviendo False.
    if not user or not user.check_password(password):
        return jsonify({"error": "Credenciales inválidas"}), 401

    token = create_access_token(
        identity=str(user.id),
        additional_claims={"ver": user.session_version},
    )

    return jsonify({
        "message": "Inicio de sesión exitoso",
        "jwt": token,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email
        }
    }), 200


@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    try:
        user_id = get_jwt_identity()
        claims = get_jwt()

        db.session.add(RevokedToken(
            jti=claims["jti"],
            token_type=claims["type"],
            user_id=user_id,
            expires_at=datetime.fromtimestamp(claims["exp"], tz=UTC).replace(tzinfo=None),
        ))

        user = User.query.get(user_id)
        if user:
            user.session_version += 1

        db.session.commit()

        return jsonify({"message": "Cierre de sesión exitoso"}), 200
    except Exception:
        db.session.rollback()
        raise


@auth_bp.route("/google-nonce", methods=["GET"])
@limiter.limit("20 per minute")
def google_nonce():
    """Genera un nonce de un solo intento y su 'state' firmado. El
    frontend debe pasar el nonce a google.accounts.id.initialize() y
    devolver el state junto con el ID token resultante -- así el backend
    puede comprobar que ese ID token corresponde a ESTE intento de login y
    no a uno capturado/reutilizado de otro momento (protección de
    replay/CSRF del login: no depender solo de CORS, que no evita que un
    token robado se reenvíe desde cualquier cliente HTTP)."""
    if not current_app.config.get("GOOGLE_CLIENT_ID"):
        return jsonify({"error": "El acceso con Google no está disponible en este momento."}), 503

    nonce = secrets.token_urlsafe(24)
    state = _google_nonce_serializer().dumps({"nonce": nonce})
    return jsonify({"nonce": nonce, "state": state}), 200


@auth_bp.route("/google-login", methods=["POST"])
@limiter.limit("10 per minute")
def google_login():
    google_client_id = current_app.config.get("GOOGLE_CLIENT_ID")
    if not google_client_id:
        return jsonify({"error": "El acceso con Google no está disponible en este momento."}), 503

    data = request.get_json(silent=True) or {}
    credential = data.get("credential")
    state = data.get("state")

    if not isinstance(credential, str) or not credential:
        return jsonify({"error": "Falta la credencial de Google."}), 400
    if not isinstance(state, str) or not state:
        return jsonify({"error": "La solicitud de acceso con Google expiró o no es válida. Intenta de nuevo."}), 401

    try:
        expected_nonce = _google_nonce_serializer().loads(
            state, max_age=GOOGLE_NONCE_MAX_AGE_SECONDS
        )["nonce"]
    except (BadSignature, SignatureExpired, KeyError, TypeError):
        return jsonify({"error": "La solicitud de acceso con Google expiró o no es válida. Intenta de nuevo."}), 401

    try:
        claims = verify_google_id_token(credential, audience=google_client_id)
    except GoogleTokenError:
        return jsonify({"error": "No se pudo verificar la cuenta de Google."}), 401

    if claims.get("nonce") != expected_nonce:
        return jsonify({"error": "La solicitud de acceso con Google expiró o no es válida. Intenta de nuevo."}), 401

    sub = claims.get("sub")
    email = claims.get("email")
    email_verified = bool(claims.get("email_verified"))
    name = (claims.get("name") or "").strip() or (email.split("@")[0] if email else "Usuario de Google")

    # Caso (a): identidad de Google ya vinculada a una cuenta -- login
    # directo, sin comparar emails para nada, el sub ya es la prueba.
    identity = AuthIdentity.query.filter_by(provider="google", provider_subject=sub).first()
    if identity:
        # Se refresca el snapshot de lo que Google reportó en ESTE login,
        # pero nunca se sobreescribe el email local del User (que puede
        # diferir si el usuario lo cambió por otro medio) ni se toca su
        # email_verified ya establecido -- un valor momentáneamente falso
        # de Google no debe degradar un estado local ya confirmado antes.
        identity.provider_email = email
        identity.provider_email_verified = email_verified
        db.session.commit()
        return _issue_session_response(identity.user)

    # A partir de aquí se crearía algo nuevo: exige email verificado por
    # Google -- no se crea una cuenta nueva a partir de un correo que
    # Google mismo no confirma como verdadero.
    if not email or not email_verified:
        return jsonify({
            "error": "Tu cuenta de Google debe tener un correo verificado para continuar."
        }), 403

    normalized_email = normalize_email(email)
    if not normalized_email:
        return jsonify({"error": "El correo de tu cuenta de Google no es válido."}), 400

    existing_user = User.query.filter_by(email=normalized_email).first()
    if existing_user:
        # Caso (c): ya existe una cuenta (normalmente con contraseña) con
        # este email. NO se vincula automáticamente solo porque coincida
        # -- eso no prueba que quien está haciendo clic en "Iniciar sesión
        # con Google" sea el dueño de esa cuenta. Se informa con claridad
        # para que pueda seguir entrando con su contraseña; la vinculación
        # desde un Perfil ya autenticado queda fuera de esta primera
        # versión (no se ofrece una acción que todavía no existe).
        return jsonify({
            "error": "Ya existe una cuenta con este correo. Inicia sesión con tu contraseña para continuar.",
            "code": "email_conflict",
        }), 409

    # Caso (b): cuenta nueva. Transaccional y tolerante a condiciones de
    # carrera -- dos pestañas/peticiones concurrentes con el mismo sub o
    # el mismo email no deben terminar en usuarios/identidades duplicados.
    new_user = User(name=name, email=normalized_email, password=None)
    new_user.email_verified = True
    new_user.email_verified_at = datetime.now(UTC).replace(tzinfo=None)
    db.session.add(new_user)
    try:
        db.session.flush()
        db.session.add(AuthIdentity(
            user_id=new_user.id,
            provider="google",
            provider_subject=sub,
            provider_email=email,
            provider_email_verified=email_verified,
        ))
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        # Otra petición concurrente ganó la carrera -- se resuelve
        # consultando de nuevo en vez de asumir cuál de los dos casos
        # ocurrió.
        identity_retry = AuthIdentity.query.filter_by(provider="google", provider_subject=sub).first()
        if identity_retry:
            return _issue_session_response(identity_retry.user)
        conflict_retry = User.query.filter_by(email=normalized_email).first()
        if conflict_retry:
            return jsonify({
                "error": "Ya existe una cuenta con este correo. Inicia sesión con tu contraseña para continuar.",
                "code": "email_conflict",
            }), 409
        return jsonify({"error": "No se pudo completar el acceso con Google. Intenta de nuevo."}), 500

    return _issue_session_response(new_user, status_code=201, message="Cuenta creada con Google")


@auth_bp.route("/admin", methods=["GET"])
@jwt_required()
@role_required("admin")
def admin_dashboard():
    return jsonify({"message": "Bienvenido al panel de administrador"}), 200
