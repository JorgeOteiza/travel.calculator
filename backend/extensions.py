from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_migrate import Migrate
from flask_caching import Cache

db = SQLAlchemy()
bcrypt = Bcrypt()
migrate = Migrate()

# Configuración de caché
cache = Cache()

def init_extensions(app):
    # ...existing code...
    cache.init_app(app, config={"CACHE_TYPE": "SimpleCache"})
