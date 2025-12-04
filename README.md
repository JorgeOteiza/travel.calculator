🚗 Travel Calculator – Full-Stack App (Flask + React + Vite)

Este repositorio contiene una aplicación full-stack que incluye:

Backend: Flask + SQLAlchemy + JWT

Frontend: React + Vite

Integración de Google Maps, direcciones, rutas y cálculo de viajes

Proxy automático /api → backend

El objetivo de este README es que cualquier desarrollador pueda abrir el proyecto sin necesidad de instalar nada manualmente fuera de:

✔️ Python
✔️ Pipenv
✔️ Node.js
✔️ npm

📦 1. Requisitos

Asegúrate de tener instalado:

Tecnología Versión recomendada
Python 3.12 (o compatible)
Pipenv Última estable
Node.js 18+
npm 9+
⚙️ 2. Clonar el proyecto
git clone <URL-del-repo>
cd travelcalculator

🔐 3. Variables de entorno
3.1. Backend y frontend usan .env

Antes de ejecutar el proyecto:

Copia el archivo de ejemplo:

cp .env.example .env

Completa los valores necesarios:

.env.example

# Backend

SQLALCHEMY_DATABASE_URI=sqlite:///app.db
JWT_SECRET_KEY=change_this_key
DEBUG=True

# Frontend

VITE_BACKEND_URL=http://localhost:5000
VITE_GOOGLE_MAPS_API_KEY=TU_API_KEY_AQUI
VITE_MAP_ID=TU_MAP_ID_AQUI
VITE_OPENWEATHERMAP_API_KEY=TU_API_KEY_AQUI

🖥️ 4. Backend (Flask)

El backend se ejecuta con Pipenv.

4.1. Instalar dependencias del backend

Desde la raíz del proyecto:

pipenv install

Incluye automáticamente:

Flask

flask-sqlalchemy

flask-cors

flask-jwt-extended

flask-bcrypt

flask-migrate

python-dotenv

requests

Si usas MySQL o PostgreSQL, asegúrate de agregar su driver en el Pipfile.

4.2. Ejecutar el backend

Incluye un script en Pipfile:

[scripts]
backend = "python app.py"

Entonces ejecutas:

pipenv run backend

Esto levanta Flask en:

http://localhost:5000

🌐 5. Frontend (React + Vite)
5.1. Instalar dependencias
npm install

5.2. Ejecutar el proyecto
npm run dev

Esto levanta el frontend en:

http://localhost:5173

5.3. Proxy /api → backend

Tu configuración Vite ya incluye:

server: {
proxy: {
"/api": {
target: "http://localhost:5000",
changeOrigin: true,
},
},
},

Por lo tanto, el frontend automáticamente reenvía:

/api/... → http://localhost:5000/api/...

🚀 6. Flujo de desarrollo recomendado

En dos terminales:

Terminal 1 — Backend
pipenv run backend

Terminal 2 — Frontend
npm run dev

Abrir navegador en:

http://localhost:5173

📚 7. Estructura del repositorio
root/
│ app.py
│ Pipfile
│ .env.example
│ package.json
│ vite.config.js
│ README.md
│
├── backend/
│ ├── routes/
│ ├── models/
│ ├── extensions.py
│ └── ...
│
└── src/
├── components/
├── pages/
├── constants/
└── utils/

🗺️ 8. Google Maps Integration – Legacy Autocomplete Support

Este proyecto integra Google Maps utilizando la API clásica (google.maps.places.Autocomplete), que sigue operativa porque la clave API fue creada antes del 1 de marzo de 2025, cuando Google deshabilitó Autocomplete para claves nuevas.

✔️ Funciona correctamente
⚠️ Puede mostrar advertencias en consola (según Google), pero no afectan funcionamiento.
Principales componentes:

src/components/GoogleMapSection.jsx

src/constants/googleMaps.js

src/utils/loadGoogleMaps.js

Más detalles en la sección original:

(Aquí mantenemos tu contenido completo tal como lo escribiste, ya integrado y organizado.)

📝 9. Última revisión

Mayo 2025
Responsable: Jorge Ariel Cancino Oteiza
