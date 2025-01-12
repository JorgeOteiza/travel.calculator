from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Brand(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name
        }

class Model(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    brand_id = db.Column(db.Integer, db.ForeignKey('brand.id'))
    brand = db.relationship('Brand')

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "brand": self.brand.name
        }

class Trip(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    brand = db.Column(db.String(80), nullable=False)
    model = db.Column(db.String(80), nullable=False)
    fuel_type = db.Column(db.String(20), nullable=False)
    location = db.Column(db.String(120), nullable=False)
    distance = db.Column(db.Float, nullable=False)
    fuel_consumed = db.Column(db.Float, nullable=False)
    total_cost = db.Column(db.Float, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "brand": self.brand,
            "model": self.model,
            "fuel_type": self.fuel_type,
            "location": self.location,
            "distance": self.distance,
            "fuel_consumed": self.fuel_consumed,
            "total_cost": self.total_cost
        }
