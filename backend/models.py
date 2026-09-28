from datetime import UTC, datetime
from backend.extensions import db, bcrypt
from backend.utils.email_utils import normalize_email


class User(db.Model):
    __tablename__ = "user"

    __table_args__ = (
        # Garantía a nivel de base de datos de que email siempre queda en
        # forma canónica (recortado + minúsculas) y no vacío, sin depender
        # únicamente de que cada ruta recuerde llamar a normalize_email().
        # lower()/trim() son funciones SQL estándar, compatibles tanto con
        # PostgreSQL como con el SQLite en memoria que usan los tests --
        # deliberadamente se evita algo PostgreSQL-only como btrim().
        #
        # NOTA sobre equivalencia con normalize_email(): trim() SQL (sin
        # argumentos de caracteres) solo recorta el carácter espacio (0x20)
        # -- verificado empíricamente igual en PostgreSQL y SQLite --, a
        # diferencia de Python str.strip(), que también recorta tab/salto
        # de línea. No es una equivalencia perfecta, pero cualquier email
        # que llegue a esta tabla ya pasó por normalize_email() (rutas y
        # User.__init__), así que en la práctica esto solo importaría ante
        # un INSERT que evite por completo la capa de aplicación -- riesgo
        # aceptado deliberadamente en vez de introducir una expresión
        # PostgreSQL-only o un trigger solo para igualar ese detalle.
        db.CheckConstraint(
            "email <> '' AND email = lower(trim(email))",
            name="ck_user_email_canonical",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    # Nullable: una cuenta creada exclusivamente mediante un proveedor
    # externo (p. ej. Google) no tiene ni necesita contraseña propia. El
    # registro tradicional (backend/routes/auth_routes.py) sigue exigiendo
    # contraseña igual que antes -- este cambio de esquema no relaja esa
    # validación, solo permite que exista el caso sin contraseña.
    password = db.Column(db.String(256), nullable=True)
    session_version = db.Column(db.Integer, nullable=False, default=0)
    # NOT NULL con default de aplicación en False y server_default a nivel
    # de base de datos (coherente con el ALTER TABLE de la migración): las
    # cuentas existentes NO verificaron realmente su correo, así que quedan
    # en False -- no se les atribuye un hecho que no ocurrió. Todavía no se
    # usa como gate de ninguna funcionalidad (login, guardar viajes, perfil).
    email_verified = db.Column(db.Boolean, nullable=False, default=False, server_default=db.false())
    email_verified_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(UTC).replace(tzinfo=None))

    trips = db.relationship("Trip", back_populates="user", cascade="all, delete", lazy=True)
    roles = db.relationship("Role", secondary="user_role", backref="users")
    # Vínculos con proveedores externos (Google y, más adelante, otros) y
    # tokens de verificación/recuperación. Si se elimina un User, ninguno de
    # los dos tiene sentido por sí solo -- mismo criterio de cascade que ya
    # se usa para trips. El cascade se declara aquí, del lado "uno", no en
    # AuthIdentity.user/VerificationToken.user -- es la convención habitual
    # de SQLAlchemy y la que ya sigue trips/Trip.user.
    #
    # Nota deliberada sobre el alcance de este cascade: es EXCLUSIVAMENTE a
    # nivel de ORM (cascade="all, delete" de SQLAlchemy), igual que ya hace
    # el proyecto para trips/RevokedToken -- ninguna FK del esquema usa
    # ondelete="CASCADE" a nivel de PostgreSQL. Esto significa que eliminar
    # un User funciona limpiamente vía db.session.delete(user) (el ORM
    # borra primero las filas hijas), pero un DELETE directo en PostgreSQL
    # que ignore el ORM fallará por violación de FK si quedan filas
    # relacionadas -- no las elimina en cascada ni las deja huérfanas en
    # silencio. Mantener el mismo criterio que trips evita mezclar dos
    # comportamientos de cascade distintos dentro del mismo esquema.
    auth_identities = db.relationship(
        "AuthIdentity", back_populates="user", cascade="all, delete", lazy=True
    )
    verification_tokens = db.relationship(
        "VerificationToken", back_populates="user", cascade="all, delete", lazy=True
    )

    def __init__(self, name, email, password):
        self.name = name
        # Canonicaliza también aquí, no solo en las rutas: cualquier código
        # interno (seeds, tests, futuros flujos OAuth) que construya un
        # User directamente termina con el mismo email canónico que exige
        # el CheckConstraint de la tabla, sin duplicar la lógica de
        # normalize_email() en cada sitio de llamada. NO cambia el
        # requisito de password -- eso sigue siendo exclusivo del
        # checkpoint de Google OAuth.
        self.email = normalize_email(email)
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

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(UTC).replace(tzinfo=None))
    
    calibration_factor = db.Column(db.Float, default=1.0, nullable=False)
    calibration_samples = db.Column(db.Integer, default=0, nullable=False)

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

    # ======================
    # 🔑 Identidad
    # ======================
    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    vehicle_id = db.Column(db.Integer, db.ForeignKey("vehicle.id"), nullable=True)

    # ======================
    # 🚗 Snapshot del vehículo
    # ======================
    brand = db.Column(db.String(100), nullable=False)
    model = db.Column(db.String(100), nullable=False)
    year = db.Column(db.Integer, nullable=False)

    fuel_type = db.Column(db.String(50), nullable=False)
    fuel_price = db.Column(db.Float, nullable=True)
    fuel_octane = db.Column(db.String(20), nullable=True)

    # ======================
    # ⚖️ Carga y viaje
    # ======================
    total_weight = db.Column(db.Float, nullable=False)
    passengers = db.Column(db.Integer, nullable=False)

    location = db.Column(db.String(255), nullable=False)
    origin_label = db.Column(db.String(255), nullable=True)
    destination_label = db.Column(db.String(255), nullable=True)
    distance = db.Column(db.Float, nullable=False)

    road_grade = db.Column(db.Float, nullable=False)
    road_profile = db.Column(db.String(20), nullable=False, default="mixed")
    driving_style = db.Column(db.String(20), nullable=False, default="moderate")
    weather = db.Column(db.String(50), nullable=False)

    # ======================
    # 🔢 Modelo de consumo
    # ======================
    consumption_type = db.Column(db.String(20))   # mixed | highway
    base_consumption = db.Column(db.Float)         # L/100km base

    expected_consumption = db.Column(db.Float, nullable=False)  # modelo
    adjusted_consumption = db.Column(db.Float)                  # persistencia histórica
    calibration_factor_used = db.Column(db.Float)

    real_consumption = db.Column(db.Float, nullable=True)        # input usuario
    user_consumption_kml = db.Column(db.Float, nullable=True)
    consumption_reference_profile = db.Column(db.String(20), nullable=True)
    consumption_source = db.Column(db.String(20), nullable=False, default="standard")

    elevation_profile = db.Column(db.JSON, nullable=True)
    consumption_profile = db.Column(db.JSON, nullable=True)
    elevation_source = db.Column(db.String(50), nullable=True)
    segments_analyzed = db.Column(db.Integer, nullable=True)
    operating_conditions = db.Column(db.JSON, nullable=True)

    # ======================
    # ⛽ Resultado económico
    # ======================
    fuel_consumed = db.Column(db.Float, nullable=False)
    total_cost = db.Column(db.Float, nullable=False)

    # ======================
    # ⏱️ Metadata
    # ======================
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(UTC).replace(tzinfo=None))

    # ======================
    # 🔗 Relaciones
    # ======================
    user = db.relationship("User", back_populates="trips", lazy=True)
    vehicle = db.relationship("Vehicle", back_populates="trips", lazy=True)

    # ======================
    # 📤 Serialización
    # ======================
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
            "fuel_octane": self.fuel_octane,

            "total_weight": self.total_weight,
            "passengers": self.passengers,

            "location": self.location,
            "origin_label": self.origin_label,
            "destination_label": self.destination_label,
            "distance": self.distance,

            "road_grade": self.road_grade,
            "road_profile": self.road_profile,
            "driving_style": self.driving_style,
            "weather": self.weather,

            "consumption_type": self.consumption_type,
            "base_consumption": self.base_consumption,
            "expected_consumption": self.expected_consumption,
            "adjusted_consumption": self.adjusted_consumption,
            "real_consumption": self.real_consumption,
            "user_consumption_kml": self.user_consumption_kml,
            "consumption_reference_profile": self.consumption_reference_profile,
            "consumption_source": self.consumption_source,
            "calibration_factor_used": self.calibration_factor_used,

            "elevation_profile": self.elevation_profile,
            "consumption_profile": self.consumption_profile,
            "elevation_source": self.elevation_source,
            "segments_analyzed": self.segments_analyzed,
            "operating_conditions": self.operating_conditions,

            "fuel_consumed": self.fuel_consumed,
            "total_cost": self.total_cost,

            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S")
            if self.created_at else None,
        }



class Role(db.Model):
    __tablename__ = "role"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)


class UserRole(db.Model):
    __tablename__ = "user_role"

    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), primary_key=True)
    role_id = db.Column(db.Integer, db.ForeignKey("role.id"), primary_key=True)


class RevokedToken(db.Model):
    __tablename__ = "revoked_token"

    id = db.Column(db.Integer, primary_key=True)
    jti = db.Column(db.String(36), nullable=False, unique=True, index=True)
    token_type = db.Column(db.String(10), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    revoked_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(UTC).replace(tzinfo=None)
    )


class AuthIdentity(db.Model):
    """Vínculo entre un User y una identidad externa (Google y, más
    adelante, otros proveedores OIDC/OAuth). Preparatorio: en este
    checkpoint no se genera, valida ni consume ninguna identidad todavía.

    provider_subject es el identificador ESTABLE que entrega el proveedor
    (p. ej. el "sub" de un ID token de Google) -- nunca el email, que puede
    cambiar o faltar según el proveedor. provider_email/
    provider_email_verified son solo lo que el proveedor reportó en el
    momento del vínculo, no se usan como prueba de identidad por sí solos.
    """
    __tablename__ = "auth_identity"

    __table_args__ = (
        db.UniqueConstraint(
            "provider", "provider_subject", name="uq_auth_identity_provider_subject"
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)

    provider = db.Column(db.String(30), nullable=False)
    provider_subject = db.Column(db.String(255), nullable=False)

    provider_email = db.Column(db.String(120), nullable=True)
    provider_email_verified = db.Column(
        db.Boolean, nullable=False, default=False, server_default=db.false()
    )

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(UTC).replace(tzinfo=None))

    user = db.relationship("User", back_populates="auth_identities")


class VerificationToken(db.Model):
    """Token reutilizable de un solo uso para verificación de correo y,
    más adelante, recuperación de contraseña. Preparatorio: en este
    checkpoint no se genera, hashea ni consume ningún token todavía.

    Se guarda solo el HASH del token, nunca el token en texto plano -- igual
    criterio que ya se usa para password en User. `purpose` distingue el uso
    ("email_verification" | futuro "password_reset") reutilizando la misma
    tabla en vez de duplicar su forma cuando se agregue recuperación de
    contraseña.

    `purpose` es un string, no un ENUM nativo de PostgreSQL: todos los demás
    campos "de tipo/categoría" del proyecto (token_type, data_source,
    fuel_type, road_profile, driving_style, weather, consumption_source,
    elevation_source, etc.) ya usan db.String, ninguno usa ENUM de Postgres
    -- y un ENUM nativo exigiría una migración de esquema (ALTER TYPE) cada
    vez que se agregue un nuevo propósito, mientras que un string no
    requiere ningún cambio de esquema para aceptar "password_reset" el día
    de mañana.
    """
    __tablename__ = "verification_token"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)

    token_hash = db.Column(db.String(128), nullable=False, unique=True)
    purpose = db.Column(db.String(30), nullable=False)

    expires_at = db.Column(db.DateTime, nullable=False)
    used_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(UTC).replace(tzinfo=None))

    user = db.relationship("User", back_populates="verification_tokens")
