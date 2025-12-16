Calculadora de viajes: aplicación completa (Flask + React + Vite)
# 🚗 Calculadora de viajes – Aplicación completa
Este repositorio contiene una aplicación full-stack que incluye:
Aplicación completa para calcular los costos de viaje y el consumo de combustible según las especificaciones del vehículo, las condiciones climáticas y las características de la ruta
Backend: Flask + SQLAlchemy + JWT
## 🎯 Características
Interfaz: React + Vite
- **Backend:** Flask + SQLAlchemy + JWT + PostgreSQL
- **Frontend:** React + Vite + Bootstrap
- **Integración de API:** Google Maps, OpenWeatherMap, base de datos de vehículos NHTSA
- **Autenticación:** JWT con bcrypt para contraseñas
- **Cálculo de viajes:** Considera distancia, consumo del vehículo, clima, pendiente de la ruta y peso total
Integración de Google Maps, direcciones, rutas y cálculo de viajes.
---
Proxy automático /api → backend
## 📦 Requisitos
El objetivo de este README es que cualquier desarrollador pueda abrir el proyecto sin necesidad de instalar nada manualmente fuera de:
Asegúrate de tener instalado:
✔️ Python
✔️ Pipenv
✔️ Node.js
✔️ npm
| Tecnología | Versión recomendada |
|-----------|---------------------|
| Python | 3.12 (o compatible) |
| Pipenv | Última estable |
| Node.js | 18+ |
| npm | 9+ |
| PostgreSQL| 12+ |
📦 1. Requisitos
---
Asegúrate de tener instalado:
## ⚙️ Instalación
Tecnología Versión recomendada
Python 3.12 (o compatible)
Pipenv Última estable
Node.js 18+
npm 9+
⚙️ 2. Clonar el proyecto
git clone <URL-del-repositorio>
cd travelcalculator
### 1. Clonar el proyecto
🔐 3. Variables de entorno
3.1. Backend y frontend usan .env
```bash
git clone https://github.com/JorgeOteiza/travel.calculator.git
cd travel.calculator
```
Antes de ejecutar el proyecto:
### 2. Configurar variables de entorno
Copia el archivo de ejemplo:
Crea un archivo `.env` en la raíz del proyecto:
cp .env.example .env
```bash
# Backend - Base de datos
SQLALCHEMY_DATABASE_URI=postgresql://usuario:contraseña@localhost:5432/calculadora_de_viajes
JWT_SECRET_KEY=tu_clave_secreta_aquí
DEBUG=Verdadero
Complete los valores necesarios:
# Frontend - APIs externas
VITE_BACKEND_URL=http://localhost:5000
VITE_GOOGLE_MAPS_API_KEY=tu_clave_api_aquí
VITE_MAP_ID=tu_id_mapa_aquí
VITE_OPENWEATHERMAP_API_KEY=tu_clave_api_aquí
```
.env.example
**⚠️ Importante:**
- Reemplaza los valores de ejemplo con tus credenciales reales
- Asegúrese de que PostgreSQL esté corriendo antes de continuar
# Backend
### 3. Configurar el backend
SQLALCHEMY_DATABASE_URI=sqlite:///app.db
JWT_SECRET_KEY=cambiar_esta_clave
DEBUG=Verdadero
```bash
# Instalar dependencias
instalación de pipenv
# Interfaz
# Crear base de datos y aplicar migraciones
pipenv ejecuta flask db upgrade
VITE_BACKEND_URL=http://localhost:5000
VITE_GOOGLE_MAPS_API_KEY=TU_API_KEY_AQUI
VITE_MAP_ID=TU_MAP_ID_AQUI
VITE_OPENWEATHERMAP_API_KEY=TU_API_KEY_AQUI
# Iniciar servidor Flask (puerto 5000)
pipenv run backend
```
🖥️ 4. Backend (Flask)
### 4. Configurar Frontend
El backend se ejecuta con Pipenv.
En una terminal separada:
4.1. Instalar dependencias del backend
```bash
# Instalar dependencias
npm install
Desde la raíz del proyecto:
# Iniciar servidor de desarrollo (puerto 5173)
npm run dev
```
instalación de pipenv
### 5. Acceder a la aplicación
 
Abre tu navegador en: **http://localhost:5173**
 
---
 
## 🗂️ Estructura del Proyecto
 
```
travel.calculator/
├── app.py # Punto de entrada Flask
├── backend/
│ ├── extensiones.py # Extensiones Flask (db, bcrypt, migration)
│ ├── models.py # Modelos SQLAlchemy (Usuario, Vehículo, Viaje)
│ ├── rutas/ #Planos de rutas
│ │ ├── __init__.py # Registro de planos
│ │ ├── auth_routes.py # Autenticación y usuarios
│ │ ├── car_routes.py # Datos de vehículos
│ │ ├── trip_routes.py #CRUD de viajes
│ │ ├── distancia_rutas.py # Cálculo de distancias
│ │ ├── clima_rutas.py #Integración clima
│ │ └── elevacion_rutas.py #Datos de elevación
│ ├── utils/ #Funciones auxiliares
│ └── data/ # Datos estáticos
├── migraciones/#Migraciones Alambique
├── src/#Código Reaccionar
│ ├── main.jsx # Punto de entrada React
│ ├── App.jsx # Componente principal con enrutamiento
│ ├── componentes/ # Componentes reutilizables
│ │ ├── TripForm.jsx # Formulario de viaje
│ │ ├── TripResults.jsx # Resultados del cálculo
│ │ ├── GoogleMapSection.jsx # Integración Google Maps
│ │ ├── Navbar.jsx # Barra de navegación
│ │ └── Footer.jsx # Pie de página
│ ├── páginas/ # Páginas de la aplicación
│ │ ├── Home.jsx # Calculadora principal
│ │ ├── Login.jsx # Inicio de sesión
│ │ ├── Register.jsx # Registro de usuario
│ │ ├── Profile.jsx # Perfil e historial
│ │ └── About.jsx # Acerca de
│ ├── ganchos/ # Ganchos personalizados
│ ├── utils/ # Utilidades interfaz
│ ├── constantes/ # Constantes (ej: googleMaps.js)
│ └── estilos/#Archivos CSS
├── vite.config.js # Configuración Vite + proxy
├── paquete.json # Dependencias Node.js
├── Pipfile # Dependencias Python
└── requisitos.txt # Requisitos Python
```
 
---
 
## 🔌 Puntos finales de API
 
### Autenticación
- `POST /api/register` - Registrar nuevo usuario
- `POST /api/login` - Iniciar sesión (retorna JWT)
- `GET /api/user` - Obtener usuario actual (requiere JWT)
 
### Vehículos
- `GET /api/cars` - Listar vehículos
- `GET /api/cars/:id` - Obtener vehículo específico
- `POST /api/cars` - Crear vehículo
Incluye automáticamente:
### Viajes
- `GET /api/trips` - Listar viajes del usuario
- `POST /api/trips` - Crear nuevo viaje
- `GET /api/trips/:id` - Obtener viaje específico
- `DELETE /api/trips/:id` - Eliminar viaje
Flask
### Utilidades
- `POST /api/distance` - Calcular distancia entre puntos
- `GET /api/weather` - Obtener datos climáticos
- `GET /api/elevation` - Obtener datos de elevación
flask-sqlalchemy
---
flask-cors
## 🛠️ Tecnologías Utilizadas
flask-jwt-extendido
### Backend
- **Flask 3.1.0** - Marco web
- **SQLAlchemy 2.0.36** - ORM
- **Flask-JWT-Extended** - Autenticación JWT
- **Flask-Bcrypt** - Hash de contraseñas
- **Flask-Migrate** - Migraciones de base de datos
- **Flask-CORS** - Manejo de CORS
- **PostgreSQL** - Base de datos
- **Solicitudes** - Cliente HTTP
flask-bcrypt
### Interfaz
- **React 18.3.1** - Librería UI
- **Vite 6.0.3** - Herramienta de compilación
- **React Router DOM 7.1.1** - Enrutamiento
- **Axios 1.7.9** - Cliente HTTP
- **Bootstrap 5.3.3** - CSS del marco
- **Framer Motion 12.6.3** - Animaciones
- **React Select 5.9.0** - Selectores avanzados
- **Google Maps API** - Mapas y geocodificación
- **OpenWeatherMap API** - Datos climáticos
flask-migrate
---
python-dotenv
## 🗺️ Integración Google Maps
solicitudes
Este proyecto utiliza la API clásica de Google Maps (`google.maps.places.Autocomplete`), que sigue operativa porque la clave API fue creada antes del 1 de marzo de 2025.
Si usas MySQL o PostgreSQL, asegúrate de agregar su controlador al Pipfile
**Estado:**
- ✅ Funciona correctamente
- ⚠️ Puede mostrar advertencias en la consola (no afectan la funcionalidad)
4.2. Ejecutar el backend
**Componentes principales:**
- `src/components/GoogleMapSection.jsx` - Componente del mapa
- `src/constants/googleMaps.js` - Configuración
- `src/utils/loadGoogleMaps.js` - Cargador de API
Incluye un script en Pipfile:
---
[scripts]
backend = "python app.py"
## 🔄 Flujo de Desarrollo
Entonces ejecuta:
### Desarrollo local (2 terminales)
**Terminal 1 - Backend:**
```bash
pipenv run backend
# Flask corriendo en http://localhost:5000
```
Esto levanta Flask en:
**Terminal 2 - Interfaz:**
```bash
npm run dev
# Vite corriendo en http://localhost:5173
```
 
### Proxy automático
 
Vite está configurado para redirigir automáticamente:
```
/api/* → http://localhost:5000/api/*
```
 
Esto permite que el frontend haga peticiones a `/api/...` sin preocuparse por CORS.
 
---
 
## 🗄️ Base de datos
 
### Modelos principales
 
**Usuario**
- Autenticación con bcrypt
- Relación uno a muchos con Trip
- Relación muchos a muchos con Vehículo
 
**Vehículo**
- Especificaciones del vehículo (marca, modelo, año)
- Datos de eficiencia (L/km, MPG)
- Motor (cilindrada, cilindros)
 
**Viaje**
- Registro de viajes calculado
- Incluye: distancia, consumo, costo, clima, pendiente
- Asociado a un usuario
http://localhost:5000
### Migraciones
🌐 5. Frontend (React + Vite)
5.1. Instalar dependencias
npm install
```bash
# Crear nueva migración
pipenv run flask db migrar -m "descripción del cambio"
5.2. Ejecutar el proyecto
npm run dev
# Aplicar migraciones
pipenv ejecuta flask db upgrade
Esto levanta el frontend en:
# Revertir la última migración
pipenv run flask db downgrade
```
http://localhost:5173
---
5.3. Proxy/api → backend
## 🧪 Scripts Disponibles
Tu configuración Vite ya incluye:
### Backend
```bash
pipenv run backend # Iniciar el servidor Flask
pipenv run dev # Alias ​​de backend
```
servidor: {
proxy: {
"/api": {
destino: "http://localhost:5000",
changeOrigin: true,
},
},
},
### Interfaz
```bash
npm run dev # Servidor de desarrollo
npm run build # Compilación para producción
npm run preview # Vista previa de la compilación
npm run lint # Ejecutar ESLint
```
Por lo tanto, el frontend se reenvía automáticamente:
---
/api/... → http://localhost:5000/api/...
## 🐛 Solución de problemas
🚀 6. Flujo de desarrollo recomendado
### Error: "No hay ningún módulo llamado 'psycopg2'"
```bash
pipenv install psycopg2-binary
```
En dos terminales:
### Error: "La base de datos no existe"
Crea la base de datos en PostgreSQL:
```sql
CREAR BASE DE DATOS travelcalculator;
```
Terminal 1 — Backend
pipenv run backend
### Error: "Token JWT expirado"
El token JWT expira después de 12 horas. Vuelve a iniciar sesión.
Terminal 2 — Interfaz
npm run dev
### Error: "Clave API de Google Maps no válida"
Verifica que tu clave API tenga habilitada:
- API de JavaScript de mapas
- API de lugares
- API de geocodificación
Abrir navegador en:
### Puerto 5000 o 5173 en uso
```bash
# Cambiar puerto Flask (app.py)
app.run(port=5001)
http://localhost:5173
# Cambiar puerto Vite (vite.config.js)
servidor: { puerto: 5174 }
```
📚 7. Estructura del repositorio
raíz/
│ app.py
│ Pipfile
│ .env.example
│ paquete.json
│ vite.config.js
│ README.md
│
├── backend/
│ ├── rutas/
│ ├── modelos/
│ ├── extensiones.py
│ └── ...
│
└── src/
├── componentes/
├── páginas/
├── constantes/
└── utilidades/
---
🗺️ 8. Integración con Google Maps: compatibilidad con la función de autocompletado heredada
## 📝 Notas de Desarrollo
Este proyecto integra Google Maps utilizando la API clásica (google.maps.places.Autocomplete), que sigue operativo porque la clave API fue creada antes del 1 de marzo de 2025, cuando Google deshabilitó Autocomplete para claves nuevas.
### Autenticación
- JWT almacenado en `localStorage`
- Token incluido en el encabezado: `Autorización: Portador <token>`
- Caducidad: 12 horas
✔️ Funciona correctamente
⚠️ Puede mostrar advertencias en la consola (según Google), pero no afecta al funcionamiento
Componentes principales:
### Cálculo de viajes
El cálculo considera:
1. **Distancia** - Obtenida de Google Maps
2. **Consumo base** - Especificaciones del vehículo
3. **Peso total** - Vehículo + pasajeros + carga
4. **Clima** - Afecta eficiencia (lluvia, viento)
5. **Pendiente** - Elevación de la ruta
6. **Precio combustible** - Ingresado por usuario
src/components/GoogleMapSection.jsx
### Convenciones de código
- **Backend:** Snake_case para variables y funciones
- **Frontend:** CamelCase para componentes, camelCase para funciones
- **Commits:** Mensajes descriptivos en español
- **Sucursales:** feature/nombre, fix/nombre, refactor/nombre
src/constants/googleMaps.js
---
src/utils/loadGoogleMaps.js
## 👤 Autor
Más detalles en la sección original:
**Jorge Ariel Cancino Oteiza**
---
📝 9. Última revisión
## 📅 Última actualización
Mayo de 2025
Responsable: Jorge Ariel Cancino Oteiza
Diciembre de 2025