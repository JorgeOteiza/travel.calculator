# Changelog - Travel Calculator

Registro de cambios importantes del proyecto.

---

## [2024-12-21/22] - Refactorización de Código y Mejoras de Seguridad

### 🔒 Seguridad
- **Removido `.env` del repositorio** para proteger API keys y credenciales
- **Creado `.env.example`** como plantilla de configuración
- **Corregida duplicación de Bcrypt** en `auth_routes.py` - ahora usa la instancia inicializada correctamente

### 🧹 Limpieza de Código
- **Centralizada configuración de APIs** en `src/config/api.js`
  - Eliminadas 11 duplicaciones de `VITE_BACKEND_URL`
  - Archivos actualizados: App.jsx, Login.jsx, Register.jsx, Profile.jsx, Navbar.jsx, TripCard.jsx, useTripCalculation.js, useWeather.js, auth.js
- **Eliminado `Root.jsx`** - componente wrapper innecesario
- **Eliminado `src/constants/env.js`** - reemplazado por configuración centralizada
- **Removidas llamadas redundantes a `load_dotenv()`** en archivos de rutas:
  - `backend/routes/distance_routes.py`
  - `backend/routes/elevation_routes.py`
  - `backend/routes/weather_routes.py`

### ⚡ Optimización de Performance
- **Eliminado doble fetch en Login.jsx**
  - Antes: Login → setTimeout → Fetch user → Navigate
  - Después: Login → Navigate (directo)
  - Mejora: -500ms en tiempo de login, -50% requests

### 🐛 Correcciones
- **Corregidos nombres de archivos CSS** para consistencia:
  - `app.css` → `App.css`
  - `tripResults.css` → `TripResults.css`

### 📊 Estadísticas
- **Commit:** `9172868`
- **Archivos modificados:** 21
- **Líneas agregadas:** 89
- **Líneas eliminadas:** 98
- **Balance neto:** -9 líneas (código más limpio)

---

## Próximas Mejoras Sugeridas

### 🔴 Prioridad Alta
- [ ] Implementar logger utility para reemplazar console.log/print (58 ocurrencias)
- [ ] Mejorar validación de formularios con rangos y formatos
- [ ] Crear constantes para valores hardcoded (6.5, 1200)

### 🟡 Prioridad Media
- [ ] Implementar Axios interceptor para manejo automático de tokens
- [ ] Agregar paginación en endpoint `/api/trips`
- [ ] Crear manejo de errores centralizado
- [ ] Agregar índices en base de datos para queries frecuentes

### 🟢 Prioridad Baja
- [ ] Optimizar queries N+1 con joinedload
- [ ] Agregar tests unitarios para endpoints críticos
- [ ] Documentar API con Swagger/OpenAPI

---

## Notas Técnicas

### Configuración de Entorno
- **Archivo `.env` NO está en Git** (protegido por `.gitignore`)
- **Usar `.env.example` como plantilla** para configuración local
- **Variables requeridas:**
  - `SQLALCHEMY_DATABASE_URI` - Conexión a PostgreSQL
  - `JWT_SECRET_KEY` - Clave secreta para tokens
  - `VITE_GOOGLE_MAPS_API_KEY` - API de Google Maps
  - `VITE_MAP_ID` - ID del mapa de Google
  - `VITE_OPENWEATHERMAP_API_KEY` - API del clima
  - `VITE_BACKEND_URL` - URL del backend (default: http://localhost:5000)

### Comandos de Desarrollo
```bash
# Backend
pipenv install
pipenv run backend

# Frontend
npm install
npm run dev

# Build de producción
npm run build
```

### Estructura de Configuración
```
src/config/
  └── api.js          # Configuración centralizada de APIs

backend/
  ├── extensions.py   # Instancias de Flask (db, bcrypt, migrate)
  └── routes/         # Blueprints de rutas
```

---

## Créditos
- **Desarrollador Principal:** Jorge Cancino Oteíza
- **Asistencia Técnica:** Ona (AI Agent)
- **Fecha:** 21-22 Diciembre 2024
