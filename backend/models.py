from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    trips = db.relationship('Trip', back_populates="user", cascade="all, delete")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Brand(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "created_at": self.created_at.isoformat()
        }

    def __repr__(self):
        return f"<Brand {self.name}>"

class Model(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    brand_id = db.Column(db.Integer, db.ForeignKey('brand.id'))
    brand = db.relationship('Brand')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "brand": self.brand.name,
            "created_at": self.created_at.isoformat()
        }

    def __repr__(self):
        return f"<Model {self.name} - Brand {self.brand.name}>"

class Trip(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    user = db.relationship('User', back_populates="trips")
    brand = db.Column(db.String(80), nullable=False)
    model = db.Column(db.String(80), nullable=False)
    fuel_type = db.Column(db.String(20), nullable=False)
    location = db.Column(db.String(120), nullable=False)
    distance = db.Column(db.Float, nullable=False)
    fuel_consumed = db.Column(db.Float, nullable=False)
    total_cost = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User')

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "brand": self.brand,
            "model": self.model,
            "fuel_type": self.fuel_type,
            "location": self.location,
            "distance": self.distance,
            "fuel_consumed": self.fuel_consumed,
            "total_cost": self.total_cost,
            "created_at": self.created_at.isoformat()
        }

    def __repr__(self):
        return f"<Trip {self.brand} {self.model} - {self.distance} km>"
