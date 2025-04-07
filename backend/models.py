from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from flask_bcrypt import Bcrypt 

db = SQLAlchemy()
bcrypt = Bcrypt()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    trips = db.relationship('Trip', back_populates="user", cascade="all, delete")

    def __init__(self, name, email, password):
        self.name = name
        self.email = email
        self.set_password(password)

    def set_password(self, password):
        if not password:
            raise ValueError("La contraseña no puede estar vacía")
        self.password = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        if not self.password:
            return False
        return bcrypt.check_password_hash(self.password, password)

    def to_dict(self):
        return {"id": self.id, "name": self.name, "email": self.email}


class Vehicle(db.Model):
    __tablename__ = "vehicle"

    id = db.Column(db.Integer, primary_key=True)
    make = db.Column(db.String(100), nullable=False)
    model = db.Column(db.String(100), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    fuel_type = db.Column(db.String(50))
    engine_cc = db.Column(db.Integer)
    engine_cylinders = db.Column(db.Integer)
    weight_kg = db.Column(db.Integer)
    lkm_mixed = db.Column(db.Float)
    mpg_mixed = db.Column(db.Float)

    def to_dict(self):
        return {
            "id": self.id,
            "make": self.make,
            "model": self.model,
            "year": self.year,
            "fuel_type": self.fuel_type,
            "engine_cc": self.engine_cc,
            "engine_cylinders": self.engine_cylinders,
            "weight_kg": self.weight_kg,
            "lkm_mixed": self.lkm_mixed,
            "mpg_mixed": self.mpg_mixed,
        }


class Trip(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    user = db.relationship('User', back_populates="trips")

    brand = db.Column(db.String(80), nullable=False)
    model = db.Column(db.String(80), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    fuel_type = db.Column(db.String(20), nullable=False)
    fuel_price = db.Column(db.Float, nullable=True)
    total_weight = db.Column(db.Float, nullable=True)
    passengers = db.Column(db.Integer, nullable=True)

    location = db.Column(db.String(120), nullable=False)
    distance = db.Column(db.Float, nullable=False)
    fuel_consumed = db.Column(db.Float, nullable=False)
    total_cost = db.Column(db.Float, nullable=False)

    road_grade = db.Column(db.Float, nullable=True)
    weather = db.Column(db.String(50), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "brand": self.brand,
            "model": self.model,
            "year": self.year,
            "fuel_type": self.fuel_type,
            "fuel_price": self.fuel_price,
            "total_weight": self.total_weight,
            "passengers": self.passengers,
            "location": self.location,
            "distance": self.distance,
            "fuel_consumed": self.fuel_consumed,
            "total_cost": self.total_cost,
            "road_grade": self.road_grade,
            "weather": self.weather,
            "created_at": self.created_at.isoformat()
        }

    def __repr__(self):
        return f"<Trip {self.brand} {self.model} - {self.distance} km>"
