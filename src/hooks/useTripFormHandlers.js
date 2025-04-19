let weatherTimeout = null;

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
    if (!newLocation?.lat || !newLocation?.lng) return;

    const coordString = `${newLocation.lat}, ${newLocation.lng}`;
    setFormData((prev) => ({ ...prev, [field]: coordString }));
    setMapCenter(newLocation);

    if (field === "location") {
      if (weatherTimeout) clearTimeout(weatherTimeout);

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
