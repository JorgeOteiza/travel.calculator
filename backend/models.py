from datetime import datetime
from backend.extensions import db, bcrypt


class User(db.Model):
    __tablename__ = "user"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    trips = db.relationship("Trip", back_populates="user", cascade="all, delete", lazy=True)
    roles = db.relationship("Role", secondary="user_role", backref="users")

    def __init__(self, name, email, password):
        self.name = name
        self.email = email
        self.set_password(password)

    def set_password(self, password):
        if not password:
            raise ValueError("La contraseña no puede estar vacía")
        self.password = bcrypt.generate_password_hash(password).decode("utf-8")

    def check_password(self, password):
        if not self.password:
            return False
        return bcrypt.check_password_hash(self.password, password)

    def to_dict(self):
        return {"id": self.id, "name": self.name, "email": self.email}

    def has_role(self, role_name):
        return any(role.name == role_name for role in self.roles)


class Vehicle(db.Model):
    __tablename__ = "vehicle"

    __table_args__ = (
        db.UniqueConstraint("make", "model", "year", name="uq_vehicle_make_model_year"),
    )

    id = db.Column(db.Integer, primary_key=True)

    make = db.Column(db.String(100), nullable=False)
    model = db.Column(db.String(100), nullable=False)
    year = db.Column(db.Integer, nullable=False)

    fuel_type = db.Column(db.String(50), nullable=False)
    engine_cc = db.Column(db.Integer)
    engine_cylinders = db.Column(db.Integer)

    weight_kg = db.Column(db.Integer, nullable=False)

    lkm_mixed = db.Column(db.Float)
    lkm_highway = db.Column(db.Float)   

    mpg_mixed = db.Column(db.Float)     

    drive_type = db.Column(db.String(20))
    transmission = db.Column(db.String(20))

    data_source = db.Column(db.String(50), default="manual")

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    trips = db.relationship("Trip", back_populates="vehicle", lazy=True)

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
            "drive_type": self.drive_type,
            "transmission": self.transmission,
            "data_source": self.data_source,
        }
    def __repr__(self):
           return f"<Vehicle {self.make} {self.model} {self.year}>"

class UserVehicle(db.Model):
    __tablename__ = "user_vehicle"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    vehicle_id = db.Column(db.Integer, db.ForeignKey("vehicle.id"), nullable=False)


class Trip(db.Model):
    __tablename__ = "trip"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    vehicle_id = db.Column(db.Integer, db.ForeignKey("vehicle.id"), nullable=True)

    brand = db.Column(db.String(100), nullable=False)
    model = db.Column(db.String(100), nullable=False)
    year = db.Column(db.Integer, nullable=False)

    fuel_type = db.Column(db.String(50), nullable=False)
    fuel_price = db.Column(db.Float, nullable=True)

    total_weight = db.Column(db.Float, nullable=False)
    passengers = db.Column(db.Integer, nullable=False)

    location = db.Column(db.String(255), nullable=False)
    distance = db.Column(db.Float, nullable=False)
    
    consumption_type = db.Column(db.String(20))   # "mixed" | "highway"
    base_consumption = db.Column(db.Float)         # l/100km usado

    fuel_consumed = db.Column(db.Float, nullable=False)
    total_cost = db.Column(db.Float, nullable=False)

    road_grade = db.Column(db.Float, nullable=False)
    weather = db.Column(db.String(50), nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", back_populates="trips", lazy=True)
    vehicle = db.relationship("Vehicle", back_populates="trips", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "vehicle_id": self.vehicle_id,
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
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S") if self.created_at else None,
        }


class Role(db.Model):
    __tablename__ = "role"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)


class UserRole(db.Model):
    __tablename__ = "user_role"

    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), primary_key=True)
    role_id = db.Column(db.Integer, db.ForeignKey("role.id"), primary_key=True)
