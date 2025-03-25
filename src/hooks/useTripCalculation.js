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
      const tripData = {
        ...formData,
        totalWeight: Number(formData.totalWeight),
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
      setResults(response.data);
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
