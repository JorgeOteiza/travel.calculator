/**
 * Carga dinámica del script de Google Maps con la clave definida en .env.
 * Evita múltiples cargas si ya está disponible en el entorno global.
 *
 * @param {Function} callback - Función a ejecutar cuando el script se haya cargado.
 */
let scriptLoaded = false;

export const loadGoogleMapsScript = (callback) => {
  if (
    typeof window.google === "object" &&
    typeof window.google.maps === "object"
  ) {
    callback();
    return;
  }

  if (scriptLoaded) return; // 👈 Previene múltiples cargas
  scriptLoaded = true;

  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  }&libraries=places`;
  script.async = true;
  script.defer = true;
  script.onload = callback;
  document.head.appendChild(script);
};
