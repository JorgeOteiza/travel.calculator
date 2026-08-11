let loadingPromise = null;

export const loadGoogleMapsScript = (callback, onError = console.error) => {
  if (window.google?.maps) {
    callback();
    return;
  }

  if (!loadingPromise) {
    loadingPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${
        import.meta.env.VITE_GOOGLE_MAPS_API_KEY
      }&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = () => {
        loadingPromise = null;
        reject(new Error("No se pudo cargar Google Maps"));
      };
      document.head.appendChild(script);
    });
  }

  loadingPromise.then(callback).catch(onError);
};
