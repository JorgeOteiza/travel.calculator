from flask import Blueprint
from .auth_routes import auth_bp
from .car_routes import car_bp
from .trip_routes import trip_bp
from .distance_routes import distance_bp
from .weather_routes import weather_bp
from .elevation_routes import elevation_bp

main_bp = Blueprint("main_bp", __name__)

main_bp.register_blueprint(auth_bp)
main_bp.register_blueprint(car_bp, url_prefix="/cars")
main_bp.register_blueprint(trip_bp)
main_bp.register_blueprint(distance_bp)
main_bp.register_blueprint(weather_bp)
main_bp.register_blueprint(elevation_bp)

@main_bp.route("/", methods=["GET"])
def home():
    return {"message": "✅ API Running"}, 200
