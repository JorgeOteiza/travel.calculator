export const useTripFormHandlers = (
  formData,
  setFormData,
  setMapCenter,
  fetchWeather,
) => {
  const handleLocationChange = (field, data) => {
    console.log("📥 handleLocationChange", field, data);

    // 🧭 POLYLINE (FIX)
    if (field === "route_polyline") {
      setFormData((prev) => ({
        ...prev,
        route_polyline: data || "",
      }));
      return;
    }

    // 📍 ORIGEN / DESTINO
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
