# Notas de Desarrollo - Travel Calculator

Documento de referencia rápida para continuar el desarrollo.

---

## 🚀 Estado Actual del Proyecto

### ✅ Completado (21-22 Dic 2024)
- [x] Seguridad: `.env` removido del repositorio
- [x] Configuración API centralizada en `src/config/api.js`
- [x] Bcrypt corregido en auth routes
- [x] Eliminado código redundante (Root.jsx, load_dotenv duplicados)
- [x] Optimizado flujo de login (-500ms)

### 🔄 En Progreso
- [ ] Mejorar mensajes de error en Login.jsx (pendiente commit desde Windows)

### 📋 Backlog Priorizado

#### 🔴 Alta Prioridad (Próxima Sesión)
1. **Logger Utility** (~30 min)
   - Reemplazar 58 `console.log/print` statements
   - Crear `backend/utils/logger.py` y `src/utils/logger.js`
   - Implementar niveles: info, warn, error, debug

2. **Validación de Formularios** (~20 min)
   - Archivo: `src/hooks/useTripValidation.js`
   - Validar rangos (pasajeros: 1-9, peso: 0-5000kg)
   - Validar formatos (año: 1900-2025, precio >= 0)

3. **Constantes para Valores Hardcoded** (~15 min)
   - Crear `backend/constants.py`
   - Mover valores: `DEFAULT_FUEL_CONSUMPTION_LKM = 6.5`, `DEFAULT_VEHICLE_WEIGHT_KG = 1200`
   - Actualizar `backend/routes/car_routes.py`

#### 🟡 Media Prioridad
4. **Axios Interceptor** (~15 min)
   - Crear `src/utils/axiosInstance.js`
   - Auto-agregar token JWT en headers
   - Eliminar duplicación de `Authorization: Bearer ${token}`

5. **Paginación en /trips** (~20 min)
   - Modificar `backend/routes/trip_routes.py`
   - Agregar parámetros `page` y `per_page`
   - Retornar metadata: total, pages, current_page

6. **Manejo de Errores Centralizado** (~45 min)
   - Crear `backend/utils/error_handler.py`
   - Clase `APIError` con status codes
   - Registrar error handler en `app.py`

#### 🟢 Baja Prioridad
7. **Índices en Base de Datos** (~10 min)
   - Agregar índices en `backend/models.py`
   - `idx_user_created`, `idx_user_distance`

8. **Tests Unitarios** (futuro)
   - Configurar pytest para backend
   - Configurar Jest para frontend

---

## 🔧 Problemas Conocidos

### ⚠️ Advertencias (No Críticas)
- **Google Maps API:** Muestra warnings en consola (API legacy), pero funciona correctamente
- **58 console.log/print:** Statements de debug en producción (pendiente logger utility)

### 🐛 Bugs Potenciales
- **Sin paginación en /trips:** Si un usuario tiene 1000+ viajes, retorna todos
- **Queries N+1:** Potencial problema de performance con relaciones (usar `joinedload` cuando sea necesario)

---

## 📂 Archivos Clave Modificados Recientemente

```
backend/routes/
  ├── auth_routes.py          # ✅ Bcrypt corregido
  ├── distance_routes.py      # ✅ load_dotenv removido
  ├── elevation_routes.py     # ✅ load_dotenv removido
  └── weather_routes.py       # ✅ load_dotenv removido

src/
  ├── config/
  │   └── api.js              # ✅ NUEVO - Configuración centralizada
  ├── components/
  │   ├── Root.jsx            # ❌ ELIMINADO
  │   ├── Navbar.jsx          # ✅ Usa config centralizada
  │   └── TripCard.jsx        # ✅ Usa config centralizada
  ├── pages/
  │   ├── Login.jsx           # ✅ Optimizado (sin doble fetch)
  │   ├── Register.jsx        # ✅ Usa config centralizada
  │   └── Profile.jsx         # ✅ Usa config centralizada
  ├── hooks/
  │   ├── useTripCalculation.js  # ✅ Usa config centralizada
  │   └── useWeather.js       # ✅ Usa config centralizada
  ├── utils/
  │   └── auth.js             # ✅ Usa config centralizada
  ├── constants/
  │   └── env.js              # ❌ ELIMINADO
  └── main.jsx                # ✅ Importa App directamente

.env                          # ❌ REMOVIDO de Git
.env.example                  # ✅ NUEVO - Template
```

---

## 🔐 Configuración de Entorno

### Variables de Entorno Requeridas

**Backend:**
```env
SQLALCHEMY_DATABASE_URI=postgresql://usuario:contraseña@localhost:5432/travelcalculator
JWT_SECRET_KEY=tu_clave_secreta_aqui
DEBUG=True
```

**Frontend:**
```env
VITE_BACKEND_URL=http://localhost:5000
VITE_GOOGLE_MAPS_API_KEY=tu_api_key_aqui
VITE_MAP_ID=tu_map_id_aqui
VITE_OPENWEATHERMAP_API_KEY=tu_api_key_aqui
```

### Setup Rápido (Nuevo Entorno)
```bash
# 1. Clonar y entrar al repo
git clone https://github.com/JorgeOteiza/travel.calculator.git
cd travel.calculator

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales reales

# 3. Backend
pipenv install
pipenv run flask db upgrade
pipenv run backend

# 4. Frontend (nueva terminal)
npm install
npm run dev

# 5. Acceder
# http://localhost:5173
```

---

## 📊 Métricas de Código

### Antes de la Refactorización
- Duplicaciones de `VITE_BACKEND_URL`: 11
- Instancias de Bcrypt: 2 (1 sin inicializar)
- Llamadas a `load_dotenv()`: 4
- Componentes wrapper innecesarios: 1
- Tiempo de login: ~1000ms
- Requests en login: 2

### Después de la Refactorización
- Duplicaciones de `VITE_BACKEND_URL`: 1 (centralizada)
- Instancias de Bcrypt: 1 (correctamente inicializada)
- Llamadas a `load_dotenv()`: 1 (solo en app.py)
- Componentes wrapper innecesarios: 0
- Tiempo de login: ~500ms
- Requests en login: 1

### Mejoras
- ✅ **-44 líneas de código duplicado**
- ✅ **-50% requests en login**
- ✅ **-500ms en tiempo de login**
- ✅ **+1 archivo de configuración centralizada**
- ✅ **-2 archivos innecesarios**

---

## 🎯 Objetivos de la Próxima Sesión

1. **Commit desde Windows** - Cambio en Login.jsx para cuadrado verde en GitHub
2. **Logger Utility** - Implementar sistema de logging profesional
3. **Validación Mejorada** - Agregar validaciones de rangos y formatos
4. **Constantes** - Mover valores hardcoded a archivo de constantes

**Tiempo estimado:** 1-2 horas

---

## 💡 Tips para Continuar

### Al Abrir el Proyecto Mañana
1. Leer este archivo (DEVELOPMENT_NOTES.md)
2. Revisar CHANGELOG.md para contexto
3. Ejecutar `git status` para ver estado actual
4. Ejecutar `git log --oneline -5` para ver últimos commits

### Si Algo No Funciona
1. Verificar que `.env` existe y tiene todas las variables
2. Reinstalar dependencias: `pipenv install && npm install`
3. Verificar que PostgreSQL está corriendo
4. Verificar que los puertos 5000 y 5173 están libres

### Para Hacer Commits Limpios
1. Siempre desde tu Windows (no desde Gitpod)
2. Verificar identidad: `git config user.name` y `git config user.email`
3. Commits descriptivos siguiendo formato: `tipo: descripción breve`
4. Tipos: `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`

---

## 📞 Contacto y Recursos

- **Repositorio:** https://github.com/JorgeOteiza/travel.calculator
- **Desarrollador:** Jorge Cancino Oteíza (oteiza.jor@gmail.com)
- **Última actualización:** 22 Diciembre 2024

---

**Nota:** Este documento se actualiza después de cada sesión de desarrollo importante.
