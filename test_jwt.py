from backend.carAPI_jwt import get_car_api_jwt

def test_jwt():
    try:
        jwt_token = get_car_api_jwt()
        print(f"JWT Token obtenido: {jwt_token}")
    except Exception as e:
        print(f"Error al obtener el JWT Token: {e}")

if __name__ == "__main__":
    test_jwt()
