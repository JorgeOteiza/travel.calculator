let weatherTimeout = null; // variable externa para evitar múltiples llamadas

export const useTripFormHandlers = (
  formData,
  setFormData,
  setMapCenter,
  fetchWeather
) => {
  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleBrandSelect = (selectedBrand) => {
    setFormData((prev) => ({
      ...prev,
      brand: selectedBrand?.value || "",
      model: "",
    }));
  };

  const handleModelSelect = (selectedModel) => {
    setFormData((prev) => ({
      ...prev,
      model: selectedModel?.value || "",
    }));
  };

  const handleLocationChange = (field, newLocation) => {
    const coordString = `${newLocation.lat}, ${newLocation.lng}`;
    setFormData((prev) => ({ ...prev, [field]: coordString }));
    setMapCenter(newLocation);

    if (field === "location") {
      // Limpiar cualquier timeout anterior
      if (weatherTimeout) clearTimeout(weatherTimeout);

      // Esperar 700ms antes de hacer la llamada
      weatherTimeout = setTimeout(() => {
        fetchWeather(newLocation.lat, newLocation.lng);
      }, 700);
    }
  };

  return {
    handleChange,
    handleBrandSelect,
    handleModelSelect,
    handleLocationChange,
  };
};
