import { useCallback } from "react";

export const useTripFormHandlers = (
  setFormData,
  setMapCenter,
  fetchWeather,
) => {
  const handleLocationChange = useCallback((field, data) => {
    console.log("📥 handleLocationChange", field, data);

    // 🧭 POLYLINE
    if (field === "route_polyline") {
      setFormData((prev) => ({
        ...prev,
        route_polyline: data || "",
      }));
      return;
    }

    // 📍 VALIDACIÓN
    if (!data || typeof data.lat !== "number" || typeof data.lng !== "number") {
      console.warn("⚠️ Datos inválidos en ubicación:", data);
      return;
    }

    // 📍 SETEO
    setFormData((prev) => ({
      ...prev,
      [`${field}Coords`]: {
        lat: data.lat,
        lng: data.lng,
      },
      [`${field}Label`]: data.label || "",
    }));

    // 🗺️ CENTRAR MAPA
    setMapCenter({
      lat: data.lat,
      lng: data.lng,
    });

    // 🌦️ WEATHER SOLO ORIGEN
    if (field === "location") {
      fetchWeather(data.lat, data.lng);
    }
  }, [fetchWeather, setFormData, setMapCenter]);

  return { handleLocationChange };
};
