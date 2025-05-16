# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

# 🗺️ Google Maps Integration - Legacy Autocomplete Support

Este proyecto integra Google Maps utilizando la API clásica (`google.maps.places.Autocomplete`) en su componente principal de mapa (`GoogleMapSection.jsx`).

## 🧠 Contexto Técnico

Desde el **1 de marzo de 2025**, Google ha dejado de habilitar `Autocomplete` para **nuevas claves API**. Sin embargo, **esta aplicación fue creada con una clave API generada el 7 de enero de 2025**, por lo tanto:

✅ **Se mantiene el uso de `google.maps.places.Autocomplete` sin errores funcionales.**  
⚠️ Se reciben advertencias en consola, pero no afectan la funcionalidad.

## 🧩 Estructura y uso actual

### 📁 `src/components/GoogleMapSection.jsx`

- Utiliza `loadGoogleMapsScript()` para cargar el script de forma dinámica, evitando declarar la API en `index.html`.
- Se mantiene `google.maps.places.Autocomplete` para campos de origen y destino.
- Usa `navigator.geolocation` para obtener la ubicación actual.
- Se usan `DirectionsService` y `DirectionsRenderer` para trazar rutas.

### 📁 `src/constants/googleMaps.js`

Se mantiene solo lo necesario:

```js
export const DEFAULT_MAP_CENTER = {
  lat: -33.4489,
  lng: -70.6693,
};

export const MAP_OPTIONS = {
  disableDefaultUI: true,
  zoomControl: true,
};
```

**Eliminado:** `GOOGLE_MAPS_LIBRARIES`, ya que se cargan directamente mediante script.

### 📁 `src/pages/Home.jsx`

- Se importa `DEFAULT_MAP_CENTER` desde `googleMaps.js`.
- Se integran correctamente los estados de mapa y marcadores con el componente `GoogleMapSection`.

## 🧼 Limpieza y recomendaciones

- ✅ Se eliminó cualquier script de Google Maps en `index.html`.
- ✅ Se agruparon funciones de carga de script en `utils/loadGoogleMaps.js`.
- ⚠️ Se ignoran las advertencias relacionadas con `Autocomplete` según documentación oficial de Google.

## 📚 Referencias

- [Google Places Migration Guide](https://developers.google.com/maps/documentation/javascript/places-migration-overview)
- [Legacy Maps API Notice](https://developers.google.com/maps/legacy)
- [Vite and Google Maps API Integration Best Practices](https://goo.gle/js-api-loading)

---

**Última revisión:** Mayo 2025  
**Responsable:** Laura Belén Sepúlveda Prelaz
