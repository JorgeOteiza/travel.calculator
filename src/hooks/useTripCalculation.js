import axios from "axios";

const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export const useTripCalculation = (formData, setResults) => {
  const calculateTrip = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Usuario no autenticado. Inicia sesión para continuar.");
      return;
    }

    try {
      const [originLat, originLng] = formData.location
        .split(",")
        .map((coord) => parseFloat(coord.trim()));
      const [destLat, destLng] = formData.destinity
        .split(",")
        .map((coord) => parseFloat(coord.trim()));

      // ✅ Llamar a tu backend para calcular la distancia
      const distanceResponse = await axios.get(
        `${VITE_BACKEND_URL}/api/distance?origin=${originLat},${originLng}&destination=${destLat},${destLng}`
      );

      const distanceKm = distanceResponse.data.distance_km;
      if (!distanceKm) {
        alert("No se pudo calcular la distancia.");
        return;
      }

      const tripData = {
        ...formData,
        totalWeight: Number(formData.totalWeight),
        distance: distanceKm,
      };

      const response = await axios.post(
        `${VITE_BACKEND_URL}/api/calculate`,
        tripData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("✅ Resultados del viaje:", response.data);
      setResults({
        ...response.data,
        weather: formData.climate,
        roadSlope: formData.roadGrade.toString() + "%",
      });
    } catch (error) {
      console.error(
        "🚨 Error al calcular el viaje:",
        error.response?.data || error.message
      );
      alert("Error al calcular el viaje.");
    }
  };

  return { calculateTrip };
};
