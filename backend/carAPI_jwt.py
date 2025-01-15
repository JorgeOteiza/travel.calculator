import os
import requests

def get_car_api_jwt():
    """Obtiene un token JWT desde la API de CarsXE usando el Token y Secret Key."""
    api_token = os.getenv('VITE_CAR_API_TOKEN')
    api_secret = os.getenv('VITE_CAR_API_SECRET')

    if not api_token or not api_secret:
        raise ValueError("API Token o API Secret no configurados en el archivo .env")

    try:
        # Realizar la solicitud POST para obtener el JWT
        response = requests.post(
            "https://api.carsxe.com/authenticate",
            json={
                "token": api_token,
                "secret": api_secret
            }
        )

        if response.status_code == 200:
            jwt_token = response.json().get("jwt")
            return jwt_token
        else:
            return {"error": "Autenticación fallida con CarsXE API"}
    except requests.RequestException as e:
        return {"error": f"Error de conexión: {str(e)}"}