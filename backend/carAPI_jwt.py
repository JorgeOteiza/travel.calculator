import requests
import os

jwt_token = None  # Mantener el JWT en memoria para no obtener uno nuevo cada vez

def get_car_api_jwt(api_token=None, api_secret=None):
    global jwt_token

    # Si ya existe un JWT guardado, se reutiliza
    if jwt_token:
        return jwt_token

    # Si no hay JWT guardado, obtenemos uno nuevo usando el API token y secret
    if api_token is None or api_secret is None:
        api_token = os.getenv('VITE_CAR_API_TOKEN')
        api_secret = os.getenv('VITE_CAR_API_SECRET')

    if not api_token or not api_secret:
        raise ValueError("API Token o API Secret no proporcionados en el archivo .env")

    try:
        response = requests.post(
            "https://carapi.app/api/auth/login",
            headers={
                "accept": "application/json",
                "Content-Type": "application/json"
            },
            json={
                "api_token": api_token,
                "api_secret": api_secret
            }
        )

        # Revisar si la respuesta es correcta
        if response.status_code == 200:
            jwt_token = response.json().get('jwt')
            if not jwt_token:
                raise ValueError("No se pudo obtener el JWT")
            return jwt_token
        else:
            print(f"Error en la autenticación: {response.status_code} - {response.text}")
            return None

    except requests.exceptions.RequestException as e:
        print(f"Error al realizar la solicitud POST: {e}")
        return None

    except Exception as e:
        print(f"Error inesperado: {e}")
        return None
