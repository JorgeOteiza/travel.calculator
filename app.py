import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from datetime import timedelta
from dotenv import load_dotenv
from backend.models import db
from backend.routes.auth_routes import auth_bp
from backend.routes.car_routes import car_bp
from backend.routes import main_bp

# Cargar variables de entorno
load_dotenv()
bcrypt = Bcrypt()

def create_app():
    app = Flask(__name__)
    bcrypt.init_app(app)

    CORS(
        app,
        resources={r"/api/*": {"origins": "http://localhost:5173"}},
        supports_credentials=True,
    )

    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config["JWT_SECRET_KEY"] = os.getenv('JWT_SECRET_KEY', 'default_secret_key')
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=12)
    app.config["DEBUG"] = os.getenv('DEBUG', 'False') == 'True'

    db.init_app(app)
    migrate = Migrate(app, db)
    jwt = JWTManager(app)

    app.register_blueprint(auth_bp, url_prefix="/api")
    app.register_blueprint(main_bp, url_prefix="/api")
    app.register_blueprint(car_bp, url_prefix="/api/cars")

    print("🚀 Servidor Flask iniciado en modo:", "Debug" if app.config["DEBUG"] else "Producción")

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
