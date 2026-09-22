import logging
import os
import uuid
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from datetime import timedelta
from dotenv import load_dotenv
from werkzeug.exceptions import HTTPException

from backend.extensions import db, bcrypt, migrate, limiter
from backend.models import User, RevokedToken
from backend.routes import main_bp
from backend.routes.trip_calculate_and_save import trip_calc_and_save_bp

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("travelcalculator")

def create_app():
    app = Flask(__name__)

    cors_origins = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
        if origin.strip()
    ]

    # 🔥 CORS GLOBAL (bien hecho)
    CORS(
        app,
        resources={r"/api/*": {"origins": cors_origins}},
        supports_credentials=True
    )

    jwt_secret_key = os.getenv("JWT_SECRET_KEY")
    if not jwt_secret_key:
        raise RuntimeError(
            "JWT_SECRET_KEY no está definida. Configúrala como variable de entorno "
            "antes de iniciar la aplicación."
        )

    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("SQLALCHEMY_DATABASE_URI")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    # Evita reutilizar conexiones que el servidor/pooler ya cerró del lado
    # remoto mientras estaban inactivas (ver incidente SSL connection has
    # been closed unexpectedly en /api/login y /api/register).
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "pool_pre_ping": True,
    }
    app.config["JWT_SECRET_KEY"] = jwt_secret_key
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(minutes=30)
    app.config["DEBUG"] = os.getenv("DEBUG", "False") == "True"

    # extensiones
    db.init_app(app)
    migrate.init_app(app, db)
    bcrypt.init_app(app)
    limiter.init_app(app)
    jwt_manager = JWTManager(app)

    @jwt_manager.token_in_blocklist_loader
    def check_if_token_is_revoked(jwt_header, jwt_payload):
        jti = jwt_payload["jti"]
        is_revoked = (
            db.session.query(RevokedToken.id).filter_by(jti=jti).first() is not None
        )
        if is_revoked:
            return True

        user = db.session.get(User, int(jwt_payload["sub"]))
        if user is None:
            return True

        return jwt_payload.get("ver") != user.session_version

    # ✅ REGISTRAR TODOS LOS BLUEPRINTS
    app.register_blueprint(main_bp, url_prefix="/api")
    app.register_blueprint(trip_calc_and_save_bp, url_prefix="/api")

    @app.after_request
    def set_security_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = "default-src 'none'"
        return response

    @app.errorhandler(HTTPException)
    def handle_http_exception(error):
        return jsonify({"error": error.description}), error.code

    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        incident_id = uuid.uuid4().hex
        logger.exception("Error no controlado [%s]", incident_id)
        return jsonify({
            "error": "Ocurrió un error interno. Inténtalo de nuevo más tarde.",
            "incident_id": incident_id,
        }), 500

    @app.cli.command("seed-vehicles")
    def seed_vehicles_command():
        """Carga el catálogo base de vehículos (no duplica los ya existentes)."""
        from backend.seeds.vehicles import seed_vehicles
        created = seed_vehicles()
        print(f"✅ Seed de vehículos ejecutado. {created} vehículo(s) nuevo(s) creado(s).")

    logger.info("Flask iniciado correctamente")
    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=app.config["DEBUG"])
