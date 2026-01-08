import os

# Google APIs
GOOGLE_MAPS_API_KEY = os.getenv("VITE_GOOGLE_MAPS_API_KEY")

# OpenWeather
OPENWEATHER_API_KEY = os.getenv("VITE_OPENWEATHERMAP_API_KEY")

if not GOOGLE_MAPS_API_KEY:
    print("⚠️ GOOGLE_MAPS_API_KEY no encontrada")

if not OPENWEATHER_API_KEY:
    print("⚠️ OPENWEATHER_API_KEY no encontrada")
