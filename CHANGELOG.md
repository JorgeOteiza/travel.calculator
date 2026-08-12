# Changelog

Los cambios relevantes de Travel Calculator se documentan en este archivo. El formato sigue los principios de [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [Unreleased]

### Pendiente

- Despliegue público de frontend, API y PostgreSQL.
- Pruebas automatizadas del frontend.
- Calibración del modelo con consumos reales.

## [2026-08-11]

### Añadido

- Catálogo dinámico de vehículos aptos para cálculo, derivado de PostgreSQL.
- Origen y destino persistidos con nombres reales para el historial del perfil.
- Migración `c47a12e9d630` para las etiquetas de ruta de cada viaje.
- Landing pública y resultado demostrativo sin registro.
- Rutas SPA `/resultado` y `/resultado/detalles`.
- Resumen rápido, métricas, perfil de elevación y consumo por segmento.
- Modal para compartir mediante WhatsApp, Instagram, TikTok, Facebook y correo.
- Perfil vial urbano, mixto, carretera y rural.
- Migración `b91f4c21d8a0` para guardar `road_profile`.
- Dirección real obtenida desde la ubicación actual.
- Controles de zoom y arrastre del mapa.
- Formato CLP para resultados, historial y precio por litro.
- Capturas y documentación orientadas a portafolio.

### Cambiado

- Los selectores de marca, modelo y año sólo muestran combinaciones realmente calculables.
- Los vehículos incompletos responden `422` en lugar de generar un error interno `500`.
- El fallback climático ahora es neutral y las rutas planas ya no reciben una penalización fija del 8 %.
- Clima y elevación migrados a Open-Meteo como proveedor predeterminado.
- Modelo de consumo refinado por pendiente, clima, carga, pasajeros y perfil vial.
- Resultados separados entre resumen inmediato y análisis explicable.
- Rediseño responsive de navegación, Landing, About, calculadora, resultados y Profile.
- Dependencias frontend actualizadas y auditoría npm reducida a 0 vulnerabilidades conocidas.
- Timestamps actualizados para evitar el uso de `datetime.utcnow()` deprecado.

### Seguridad

- Endpoints pagados de Google bloqueados por defecto en el backend.
- Nueva variable `PAID_GOOGLE_APIS_ENABLED=False`.
- La documentación exige restricciones de dominio y cuota para Google Maps.

### Pruebas

- 11 pruebas backend para autenticación, consumo, pendiente, carga, clima, perfil vial y proveedores.
- Verificación de lint, build, migraciones y auditoría de dependencias.

## [2024-12-22]

### Añadido

- Plantilla `.env.example`.
- Configuración centralizada de API en `src/config/api.js`.

### Cambiado

- Flujo de login simplificado para evitar una consulta duplicada.
- Inicialización de Bcrypt corregida y compartida desde extensiones.
- Nombres de hojas de estilo normalizados.

### Eliminado

- Credenciales locales del repositorio.
- Componentes y archivos de configuración redundantes.

## Convenciones

Las categorías utilizadas son `Añadido`, `Cambiado`, `Corregido`, `Eliminado`, `Seguridad` y `Pruebas`. Las versiones futuras deben incluir fecha ISO (`AAAA-MM-DD`) y, cuando exista, enlace a la etiqueta o release correspondiente.
