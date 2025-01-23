from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_migrate import Migrate
import os
from dotenv import load_dotenv
from backend.models import db
from backend.routes import main_bp

# Cargar variables de entorno
load_dotenv()

def create_app():
    app = Flask(__name__)
    CORS(app)

    # Configuración de la base de datos y variables de entorno
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI')
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
    app.config['DEBUG'] = True
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = os.getenv('SQLALCHEMY_TRACK_MODIFICATIONS') == 'True'

    # Inicializar la base de datos y migraciones
    db.init_app(app)
    migrate = Migrate(app, db)

    # Registrar Blueprints
    app.register_blueprint(main_bp)

    # Crear tablas si no existen (solo para desarrollo)
    with app.app_context():
        db.create_all()

    return app

# Ejecución del servidor
if __name__ == "__main__":
    app = create_app()
    app.run(debug=app.config['DEBUG'])
