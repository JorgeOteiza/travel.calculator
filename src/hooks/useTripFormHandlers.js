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
    setFormData((prev) => ({
      ...prev,
      [field]: `${newLocation.lat}, ${newLocation.lng}`,
    }));
    setMapCenter(newLocation);
    if (field === "location") fetchWeather(newLocation.lat, newLocation.lng);
  };

  return {
    handleChange,
    handleBrandSelect,
    handleModelSelect,
    handleLocationChange,
  };
};
