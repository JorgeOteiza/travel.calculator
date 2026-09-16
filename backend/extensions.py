from flask_sqlalchemy import SQLAlchemy
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_bcrypt import Bcrypt
from flask_migrate import Migrate
from flask_caching import Cache

db = SQLAlchemy()
bcrypt = Bcrypt()
migrate = Migrate()
limiter = Limiter(key_func=get_remote_address, storage_uri="memory://")

# Configuración de caché
cache = Cache()

def init_extensions(app):
    # ...existing code...
    cache.init_app(app, config={"CACHE_TYPE": "SimpleCache"})
