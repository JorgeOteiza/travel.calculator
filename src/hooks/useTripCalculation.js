import axios from "axios";
import { API_BASE_URL } from "../config/api";

export const useTripCalculation = (formData, setResults) => {
  const calculateTrip = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      alert("Usuario no autenticado.");
      return;
    }

    if (!formData.route_polyline) {
      alert("La ruta aún se está calculando, espera un segundo");
      return;
    }

    try {
      const payload = {
        brand: formData.brand.toLowerCase(),
        model: formData.model.toLowerCase(),
        year: Number(formData.year),
        origin: formData.locationCoords,
        destination: formData.destinationCoords,
        route_polyline: formData.route_polyline,
        extra_weight: Number(formData.extraWeight),
        passengers: Number(formData.passengers),
        fuel_price: Number(formData.fuelPrice),
      };

      const res = await axios.post(
        `${API_BASE_URL}/api/trips/calculate-and-save`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setResults(res.data);
    } catch (error) {
      const msg =
        error.response?.data?.error || error.message || "Error desconocido";

      console.error("🚨 Error en cálculo:", msg);
      alert(msg);
    }
  };

  return { calculateTrip };
};
