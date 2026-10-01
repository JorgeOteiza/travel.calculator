import logging
import os

logger = logging.getLogger("travelcalculator")

# Google APIs
GOOGLE_MAPS_API_KEY = os.getenv("VITE_GOOGLE_MAPS_API_KEY")
PAID_GOOGLE_APIS_ENABLED = os.getenv("PAID_GOOGLE_APIS_ENABLED", "False") == "True"
ELEVATION_PROVIDER = os.getenv("ELEVATION_PROVIDER", "open_meteo")

# OpenWeather
OPENWEATHER_API_KEY = os.getenv("OPENWEATHERMAP_API_KEY") or os.getenv(
    "VITE_OPENWEATHERMAP_API_KEY"
)

if not GOOGLE_MAPS_API_KEY:
    logger.info("GOOGLE_MAPS_API_KEY no encontrada")

# Nota: GOOGLE_CLIENT_ID (Sign in with Google) NO se lee aquí como
# constante de módulo -- se lee dentro de create_app() (app.py) y se
# guarda en app.config, precisamente para evitar quedar congelada en lo
# que valía la primera vez que algún test importara este módulo. Ver
# app.py y backend/routes/auth_routes.py.

if not OPENWEATHER_API_KEY:
    logger.info("OPENWEATHER_API_KEY no encontrada; se usará Open-Meteo")

if not PAID_GOOGLE_APIS_ENABLED:
    logger.info("APIs pagadas de Google desactivadas en el backend")
