export const useTripFormHandlers = (
  formData,
  setFormData,
  setMapCenter,
  fetchWeather
) => {
  console.log("🧪 setFormData:", setFormData);

  const handleLocationChange = (field, data) => {
    console.log("🧭 handleLocationChange", field, data);

    if (!data?.lat || !data?.lng) return;

    setFormData((prev) => ({
      ...prev,
      [`${field}Coords`]: {
        lat: data.lat,
        lng: data.lng,
      },
      [`${field}Label`]: data.label || "",
    }));

    setMapCenter({
      lat: data.lat,
      lng: data.lng,
    });

    if (field === "location") {
      fetchWeather(data.lat, data.lng);
    }
  };

  return { handleLocationChange };
};
