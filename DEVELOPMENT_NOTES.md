# Notas de desarrollo

Estado técnico de Travel Calculator. Última revisión: 11 de agosto de 2026.

## Estado actual

- Rama estable: `master`.
- Frontend: React/Vite, responsive desde móvil hasta escritorio.
- Backend: Flask con PostgreSQL, JWT y migraciones Alembic.
- Cálculo: vehículo, perfil vial, pendiente, clima, pasajeros y carga.
- Proveedores predeterminados: Open-Meteo para clima y elevación.
- APIs pagadas del backend: bloqueadas con `PAID_GOOGLE_APIS_ENABLED=False`.
- Calidad: 12 pruebas backend, lint/build correctos y auditoría npm limpia.
- Catálogo: sólo expone vehículos con consumo mixto, peso y combustible válidos.
- Despliegue público: pendiente.

## Configuración segura

El archivo `.env` no debe incorporarse a Git. Copia `.env.example` y reemplaza únicamente los valores locales.

```env
SQLALCHEMY_DATABASE_URI=postgresql://usuario:contrasena@localhost:5432/travelcalculator
JWT_SECRET_KEY=reemplaza-por-una-clave-segura
DEBUG=False
ELEVATION_PROVIDER=open_meteo
PAID_GOOGLE_APIS_ENABLED=False
VITE_BACKEND_URL=http://localhost:5000
VITE_GOOGLE_MAPS_API_KEY=clave-restringida
VITE_MAP_ID=
```

La clave de Google Maps es pública por naturaleza porque llega al navegador. Su protección depende de restricciones HTTP por dominio, límites de cuota y APIs autorizadas en Google Cloud.

## Flujo de cálculo

```text
Formulario + mapa
      │
      ├── vehículo y consumo base
      ├── ruta y polyline
      ├── elevación por segmentos
      ├── clima y perfil vial
      └── pasajeros y peso adicional
                 │
                 ▼
       consumo ajustado + costo
                 │
        ┌────────┴─────────┐
        ▼                  ▼
  resumen rápido     análisis detallado
```

## Migraciones

La cabeza vigente es `c47a12e9d630`. Las últimas migraciones agregan el perfil vial y las etiquetas de origen/destino a los viajes.

```powershell
pipenv run flask db heads
pipenv run flask db upgrade
```

No debe utilizarse `db.create_all()` como sustituto de las migraciones en producción.

## Comprobación antes de un PR

```powershell
npm.cmd audit
npm.cmd run lint
npm.cmd run build
pipenv run python -m unittest discover -s tests -v
pipenv run flask db heads
git diff --check
```

## Próximas prioridades

### Antes del despliegue público

- Configurar frontend, API y PostgreSQL en el proveedor elegido.
- Restringir Google Maps al dominio definitivo.
- Configurar CORS, HTTPS y variables de producción.
- Ejecutar migraciones automáticamente durante el release.
- Verificar la demo y los flujos autenticados en producción.

### Calidad

- Añadir pruebas de componentes y flujos E2E del frontend.
- Incorporar casos de integración para errores de proveedores externos.
- Sustituir mensajes de depuración restantes por logging estructurado.
- Añadir paginación al historial de viajes.

### Modelo de consumo

- Registrar consumo real informado por el usuario.
- Comparar estimación versus consumo observado.
- Calibrar por vehículo sólo después de reunir muestras suficientes.
- Documentar rangos y límites de cada factor del modelo.

## Criterios de exactitud

- No presentar datos de fallback como mediciones reales.
- No habilitar vehículos sin los datos mínimos exigidos por el cálculo.
- Mantener acotados los multiplicadores de clima, pendiente y carga.
- Evitar llamadas por segmento cuando un proveedor admite consultas agrupadas.
- Probar por separado rutas planas, urbanas, de carretera, con subida y con descenso.
- Describir siempre el resultado como estimación avanzada, no como medición certificada.

## Documentación relacionada

- [README.md](README.md): presentación, instalación y arquitectura.
- [CHANGELOG.md](CHANGELOG.md): cambios relevantes por versión.
- [.env.example](.env.example): contrato de configuración.
