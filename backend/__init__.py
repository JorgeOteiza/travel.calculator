from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Instancia de SQLAlchemy
db = SQLAlchemy()

def create_app():
    """Inicializa la aplicación Flask"""
    app = Flask(__name__)
    CORS(app, resources={r"/*": {"origins": "*"}})  # Permitir todas las solicitudes CORS

    # Configuración de la base de datos
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # Inicializar la base de datos
    db.init_app(app)

    # Importación y registro de Blueprints
    from .routes import main_bp
    app.register_blueprint(main_bp)

    # Crear tablas al iniciar la app
    with app.app_context():
        db.create_all()

    return app
