from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_migrate import Migrate
import os
from dotenv import load_dotenv
from backend.models import db
from backend.routes import main_bp
from backend.auth_routes import auth_bp  # 🚨 Agrega esto para importar auth_routes

# Cargar variables de entorno
load_dotenv()

def create_app():
    app = Flask(__name__)

    # 🔹 Permitir CORS solo para el frontend (evita problemas con preflight requests)
    CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}}, supports_credentials=True)

    # Configuración de la base de datos y variables de entorno
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI')
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
    app.config['DEBUG'] = True
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # Inicializar la base de datos y migraciones
    db.init_app(app)
    migrate = Migrate(app, db)

    # Registrar Blueprints
    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp)  # 🚨 Agrega esto para que las rutas de autenticación funcionen

    # Crear tablas si no existen (solo para desarrollo)
    with app.app_context():
        db.create_all()

    return app

# Ejecución del servidor
if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
