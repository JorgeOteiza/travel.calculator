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

    def to_dict(self):
        """Convierte la instancia en un diccionario para facilitar la serialización"""
        return {
            "id": self.id,
            "vehicle": self.vehicle,
            "fuel_type": self.fuel_type,
            "location": self.location,
            "distance": self.distance,
            "fuel_consumed": self.fuel_consumed,
            "total_cost": self.total_cost
        }
