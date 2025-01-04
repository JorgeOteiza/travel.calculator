from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class Trip(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    vehicle = db.Column(db.String(80), nullable=False)
    fuel_type = db.Column(db.String(20), nullable=False)
    location = db.Column(db.String(120), nullable=False)
    distance = db.Column(db.Float, nullable=False)
    fuel_consumed = db.Column(db.Float, nullable=False)
    total_cost = db.Column(db.Float, nullable=False)

    def __init__(self, vehicle, fuel_type, location, distance, fuel_consumed, total_cost):
        self.vehicle = vehicle
        self.fuel_type = fuel_type
        self.location = location
        self.distance = distance
        self.fuel_consumed = fuel_consumed
        self.total_cost = total_cost

    def to_dict(self):
        return {
            "id": self.id,
            "vehicle": self.vehicle,
            "fuel_type": self.fuel_type,
            "location": self.location,
            "distance": self.distance,
            "fuel_consumed": self.fuel_consumed,
            "total_cost": self.total_cost,
        }
