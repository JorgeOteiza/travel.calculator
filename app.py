import os
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from datetime import timedelta
from dotenv import load_dotenv

from backend.extensions import db, bcrypt, migrate
from backend.routes import main_bp

load_dotenv()

def create_app():
    app = Flask(__name__)
    CORS(app, supports_credentials=True)

    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config["JWT_SECRET_KEY"] = os.getenv('JWT_SECRET_KEY', 'default_secret_key')
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=12)
    app.config["DEBUG"] = os.getenv('DEBUG', 'False') == 'True'

    # Inicializar extensiones
    db.init_app(app)
    migrate.init_app(app, db)
    bcrypt.init_app(app)
    JWTManager(app)

    # Registrar rutas
    app.register_blueprint(main_bp, url_prefix="/api")

    print("🚀 Flask iniciado en modo:", "Debug" if app.config["DEBUG"] else "Producción")
    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
