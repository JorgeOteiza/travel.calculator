from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_migrate import Migrate
import os
from dotenv import load_dotenv
from backend.models import db
from backend.auth_routes import auth_bp
from backend.routes import main_bp

# Cargar variables de entorno
load_dotenv()

def create_app():
    app = Flask(__name__)
    
    # ✅ Permitir CORS en todas las rutas
    CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

    # Configuración de la base de datos
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI')
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
    app.config['DEBUG'] = True
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)
    migrate = Migrate(app, db)

    # ✅ Registrar Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(main_bp) 

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=app.config['DEBUG'])
