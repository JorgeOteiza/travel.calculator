import os
import requests

def get_car_api_jwt():
    api_token = os.getenv('VITE_CAR_API_TOKEN')  # Token de la API
    api_secret = os.getenv('VITE_CAR_API_SECRET')  # Secreto de la API

    if not api_token or not api_secret:
        raise ValueError("API Token o API Secret no configurados en el archivo .env")

    try:
        # Realiza la solicitud para obtener el JWT
        response = requests.post(
            "https://carapi.app/api/auth/login",  # URL correcta para autenticarse
            headers={
                "accept": "application/json",  # Asegúrate de que la respuesta sea JSON
                "Content-Type": "application/json"
            },
            json={
                "api_token": api_token,
                "api_secret": api_secret
            }
        )

        # Revisar el código de estado de la respuesta
        if response.status_code != 200:
            print(f"Error en la autenticación: {response.status_code} - {response.text}")
            return None

        # Extraer el JWT del cuerpo de la respuesta
        jwt_token = response.json().get("jwt")
        if not jwt_token:
            raise ValueError("No se pudo obtener el JWT")

        return jwt_token

    except requests.exceptions.RequestException as e:
        print(f"Error al realizar la solicitud POST: {e}")
        return None

    except Exception as e:
        print(f"Error inesperado: {e}")
        return None
