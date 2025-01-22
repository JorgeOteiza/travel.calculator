import requests
import os

def get_car_api_jwt():
    api_token = os.getenv('VITE_CAR_API_TOKEN')  # Token de la API
    api_secret = os.getenv('VITE_CAR_API_SECRET')  # Secreto de la API

    if not api_token or not api_secret:
        raise ValueError("API Token o API Secret no configurados en el archivo .env")

    try:
        response = requests.post(
            "https://carapi.app/api/auth/login",  # URL correcta para autenticarse
            headers={
                "accept": "application/json",
                "Content-Type": "application/json"
            },
            json={
                "api_token": api_token,
                "api_secret": api_secret
            }
        )

        # Imprimir detalles de la respuesta
        print(f"Status Code: {response.status_code}")
        print(f"Response Text: {response.text}")
        
        if response.status_code == 200:
            try:
                response_json = response.json()
                print(f"Response JSON: {response_json}")
                jwt_token = response_json.get("jwt")
                if not jwt_token:
                    raise ValueError("No se pudo obtener el JWT")
                return jwt_token
            except ValueError as e:
                print(f"Error al procesar el JSON: {e}")
                return None
        else:
            print(f"Error en la autenticación: {response.status_code} - {response.text}")
            return None

    except requests.exceptions.RequestException as e:
        print(f"Error al realizar la solicitud POST: {e}")
        return None

    except Exception as e:
        print(f"Error inesperado: {e}")
        return None