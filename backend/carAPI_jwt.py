import os
import requests

def get_car_api_jwt():
    """Obtiene un token JWT desde la API de CarsXE usando el Token y Secret Key."""
    api_token = os.getenv('VITE_CAR_API_TOKEN')
    api_secret = os.getenv('VITE_CAR_API_SECRET')

    # Imprimir las variables de entorno para depuración
    print(f"API Token: {api_token}, API Secret: {api_secret}")

    # Verificar si las variables de entorno están configuradas
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

        # Imprimir el estado de respuesta y el contenido de la respuesta para depuración
        print(f"Estado de respuesta: {response.status_code}")
        print(f"Respuesta del servidor: {response.text}")

        # Manejar posibles errores en la respuesta
        response.raise_for_status()

        # Retornar el JWT
        return response.json().get("jwt")
    except requests.exceptions.RequestException as e:
        # Imprimir errores específicos de conexión
        print(f"Error en la solicitud POST: {e}")
        return {"error": f"Error de conexión con la API: {str(e)}"}
    except Exception as e:
        # Capturar cualquier otro error inesperado
        print(f"Error inesperado: {e}")
        return {"error": f"Error inesperado: {str(e)}"}
