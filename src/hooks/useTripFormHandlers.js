let weatherTimeout = null;

export const useTripFormHandlers = (
  formData,
  setFormData,
  setMapCenter,
  fetchWeather
) => {
  const handleLocationChange = (field, newLocation) => {
    if (!newLocation?.lat || !newLocation?.lng) return;

    const coordString = `${newLocation.lat}, ${newLocation.lng}`;

    // Evitar actualizaciones redundantes
    if (formData[field] === coordString) return;

    setFormData((prev) => ({ ...prev, [field]: coordString }));
    setMapCenter(newLocation);

    if (field === "location") {
      if (weatherTimeout) clearTimeout(weatherTimeout);
      weatherTimeout = setTimeout(() => {
        fetchWeather(newLocation.lat, newLocation.lng);
      }, 500); // ❗ Evita múltiples llamadas excesivas
    }
  };

  return {
    handleLocationChange,
  };
};
