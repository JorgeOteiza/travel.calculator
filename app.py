from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
import os
from dotenv import load_dotenv
from backend.models import db
from backend.auth_routes import auth_bp
from backend.routes import main_bp

# Cargar variables de entorno
load_dotenv()

def create_app():
    app = Flask(__name__)

    # ✅ Configuración de CORS para todas las rutas
    CORS(
        app,
        resources={r"/api/*": {"origins": "http://localhost:5173"}},
        supports_credentials=True,
    )

    # Configuración de la base de datos
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config["SECRET_KEY"] = os.getenv('SECRET_KEY')
    app.config["JWT_SECRET_KEY"] = os.getenv('JWT_SECRET_KEY')
    app.config["DEBUG"] = os.getenv('DEBUG', 'False') == 'True'


    db.init_app(app)
    migrate = Migrate(app, db)
    jwt = JWTManager(app)

    # ✅ Registrar Blueprints
    app.register_blueprint(auth_bp, url_prefix="/api")
    app.register_blueprint(main_bp, url_prefix="/api")

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
