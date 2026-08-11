# Travel Calculator

Aplicación full-stack para calcular distancia, consumo y costo estimado de un viaje según el vehículo, el clima, el peso y las características de la ruta.

## Caso de estudio

Antes de iniciar un viaje, comparar solamente distancia y precio de combustible deja fuera factores que cambian el consumo: vehículo, carga, pasajeros, clima y pendiente. Travel Calculator reúne esas variables, analiza la ruta por segmentos y entrega un informe visual explicable.

### Valor del proyecto

- Landing pública y resultado demostrativo para evaluación sin registro.
- Calculadora geográfica con ubicación actual y fallback en Santiago.
- Informe SPA independiente en `/resultado` con métricas y gráficos.
- Perfil de elevación Open-Meteo/Copernicus y consumo estimado por segmento, con fallback plano explícito.
- Ajustes por tipo de vía, clima, pendiente, pasajeros, carga y calibración del vehículo.
- Historial autenticado con JWT y persistencia PostgreSQL.
- Diseño responsive desde 320 px hasta monitores grandes.

## Rutas del producto

| Ruta | Propósito |
| --- | --- |
| `/` | Landing y acceso a demostración |
| `/calculadora` | Formulario y mapa interactivo |
| `/resultado` | Informe del último cálculo o demo |
| `/profile` | Perfil e historial autenticado |
| `/login`, `/register` | Acceso y creación de cuenta |

## Arquitectura

```text
React + Vite ──HTTP/JSON──> Flask API ──SQLAlchemy──> PostgreSQL
      │                         │
      └── Google Maps           ├── OpenWeatherMap
                                ├── Open-Meteo Elevation / Weather
                                └── NHTSA
```

El resultado actual se conserva en `sessionStorage` para sobrevivir una recarga dentro de la sesión sin exponer datos sensibles en la URL. Los viajes autenticados también se guardan en PostgreSQL.

## Tecnologías

- Frontend: React 18, Vite, Bootstrap y Google Maps.
- Backend: Flask, SQLAlchemy, JWT y Flask-Migrate.
- Base de datos: PostgreSQL.
- Servicios externos: Google Maps, OpenWeatherMap y NHTSA.

## Requisitos

- Python 3.12.
- Pipenv.
- Node.js 18 o superior y npm.
- PostgreSQL 12 o superior.
- Credenciales válidas para Google Maps y OpenWeatherMap.

## Instalación

Desde la raíz del repositorio:

```powershell
Copy-Item .env.example .env
pipenv install
npm.cmd install
```

Edita `.env` y configura la conexión a PostgreSQL, el secreto JWT y las claves de las APIs. La clave de Google Maps se entrega al navegador y debe estar restringida por dominio y por API desde Google Cloud Console. La clave de OpenWeatherMap queda en el backend.

Crea previamente la base de datos indicada en `SQLALCHEMY_DATABASE_URI` y aplica las migraciones:

```powershell
pipenv run flask db upgrade
```

## Ejecución en desarrollo

Abre dos terminales en la raíz del proyecto.

Terminal 1, backend:

```powershell
pipenv run backend
```

Terminal 2, frontend:

```powershell
npm.cmd run dev
```

Abre <http://localhost:5173>. La API queda disponible en <http://localhost:5000/api/>.

En PowerShell se recomienda `npm.cmd` porque algunas instalaciones de Windows bloquean `npm.ps1` mediante su política de ejecución.

## Comandos útiles

```powershell
# Comprobar el frontend
npm.cmd run lint
npm.cmd run build

# Previsualizar la compilación
npm.cmd run preview

# Consultar y aplicar migraciones
pipenv run flask db current
pipenv run flask db upgrade

# Pruebas automatizadas de cálculo y autenticación
pipenv run python -m unittest discover -s tests -v
```

## Demostración para portafolio

Desde la landing selecciona **Ver resultado de demostración**. El flujo utiliza datos representativos locales y no requiere cuenta, APIs externas ni escritura en la base de datos.

## Despliegue

El archivo `render.yaml` prepara tres recursos en Render:

- Frontend estático React/Vite.
- API Flask ejecutada con Gunicorn.
- PostgreSQL administrado.

Después de crear el Blueprint configura manualmente:

- `VITE_BACKEND_URL` con la URL pública de la API.
- `CORS_ORIGINS` con el dominio público del frontend.
- Claves de Google Maps y OpenWeatherMap.

Google Maps debe restringirse al dominio desplegado. La geolocalización del navegador requiere HTTPS, incluido automáticamente en Render.

## Decisiones técnicas

- **SPA con informe separado:** conserva una navegación fluida y ofrece espacio para explicar el resultado.
- **SVG nativo para gráficos:** evita una dependencia pesada y mantiene el bundle controlado.
- **Fallbacks explícitos:** si clima o NHTSA fallan, la interfaz informa al usuario y utiliza datos seguros.
- **Demo local:** permite a reclutadores evaluar el producto aun cuando los servicios externos estén suspendidos.
- **Variables privadas:** OpenWeather y PostgreSQL permanecen en el backend; solo Google Maps se entrega al navegador y debe restringirse.

## Variables de entorno

| Variable | Uso |
| --- | --- |
| `SQLALCHEMY_DATABASE_URI` | Conexión privada a PostgreSQL |
| `JWT_SECRET_KEY` | Firma de tokens JWT |
| `DEBUG` | Activa el modo debug de Flask con `True` |
| `OPENWEATHERMAP_API_KEY` | Clave privada usada por Flask |
| `NHTSA_BASE_URL` | URL base del servicio NHTSA |
| `VITE_BACKEND_URL` | URL pública del backend |
| `VITE_GOOGLE_MAPS_API_KEY` | Clave pública restringida de Google Maps |
| `VITE_MAP_ID` | Identificador del mapa de Google |
| `ELEVATION_PROVIDER` | `open_meteo` por defecto; no requiere clave |
| `PAID_GOOGLE_APIS_ENABLED` | Mantener `False` para bloquear Google desde Flask |

Por compatibilidad, el backend todavía reconoce `VITE_OPENWEATHERMAP_API_KEY`, pero las instalaciones nuevas deben usar `OPENWEATHERMAP_API_KEY`.

## Estructura

```text
app.py                  Entrada de Flask
backend/                Modelos, rutas, servicios y utilidades
migrations/             Migraciones de PostgreSQL
src/                    Aplicación React
public/                 Recursos públicos
vite.config.js          Vite y proxy /api hacia Flask
```

## API principal

- `GET /api/`: estado de la API.
- `POST /api/register` y `POST /api/login`: autenticación.
- `GET /api/user`: usuario autenticado.
- `GET /api/cars/brands`, `/models` y `/model_details`: vehículos.
- `GET /api/weather`, `/distance` y `/elevation`: información de ruta.
- `POST /api/trips/calculate-and-save`: cálculo y guardado.
- `GET /api/trips` y `DELETE /api/trips/:id`: historial.

## Solución de problemas

- Si Flask no conecta, comprueba que PostgreSQL esté iniciado y revisa `SQLALCHEMY_DATABASE_URI`.
- Si el mapa no aparece, revisa las restricciones y APIs habilitadas para la clave de Google Maps.
- Si el clima falla, verifica `OPENWEATHERMAP_API_KEY`.
- Si los puertos están ocupados, detén el proceso que usa `5000` o `5173` antes de iniciar el proyecto.
