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

      // ✅ Obtener distancia desde backend
      const distanceResponse = await axios.get(
        `${VITE_BACKEND_URL}/api/distance?origin=${originLat},${originLng}&destination=${destLat},${destLng}`
      );

      const distanceKm = distanceResponse.data.distance_km;
      if (!distanceKm) {
        alert("No se pudo calcular la distancia.");
        return;
      }

      // ✅ Calcular el viaje
      const tripData = {
        ...formData,
        brand: formData.brand.trim().toLowerCase(),
        model: formData.model.trim().toLowerCase(),
        totalWeight: Number(formData.totalWeight),
        roadGrade: Number(formData.roadGrade),
        distance: distanceKm,
      };

      console.log(tripData);
      const calcResponse = await axios.post(
        `${VITE_BACKEND_URL}/api/calculate`,
        tripData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("✅ Resultados del viaje:", calcResponse.data);
      setResults({
        ...calcResponse.data,
        weather: formData.climate,
        roadSlope: formData.roadGrade.toString() + "%",
      });

      // ✅ Guardar viaje en la base de datos
      const saveTripPayload = {
        brand: formData.brand,
        model: formData.model,
        fuel_type: formData.fuelType,
        location: formData.location,
        distance: calcResponse.data.distance,
        fuel_consumed: calcResponse.data.fuelUsed,
        total_cost: calcResponse.data.totalCost,
      };

      console.log(tripData);
      const saveResponse = await axios.post(
        `${VITE_BACKEND_URL}/api/trips`,
        saveTripPayload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("💾 Viaje guardado:", saveResponse.data);
    } catch (error) {
      console.error(
        "🚨 Error al calcular o guardar el viaje:",
        error.response?.data || error.message
      );
      alert("Error al calcular o guardar el viaje.");
    }
  };

  return { calculateTrip };
};
