import axios from "axios";
import { API_BASE_URL } from "../config/api";

export const useTripCalculation = (formData, setResults) => {
  const calculateTrip = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      alert("Usuario no autenticado.");
      return;
    }

    // ===============================
    // 🧪 DEBUG: estado previo
    // ===============================
    console.log("🧪 calculateTrip llamado");
    console.log("📦 formData actual:", formData);

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

      // ===============================
      // 🧪 DEBUG: payload final
      // ===============================
      console.log("🚀 Payload enviado al backend:", payload);

      if (!payload.route_polyline) {
        console.error("❌ route_polyline NO está en el payload");
        return;
      }

      const res = await axios.post(
        `${API_BASE_URL}/api/trips/calculate-and-save`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      console.log("✅ Respuesta backend:", res.data);

      setResults(res.data);
    } catch (error) {
      const msg =
        error.response?.data?.error || error.message || "Error desconocido";

      console.error("🚨 Error en cálculo:", error);
      alert(msg);
    }
  };

  return { calculateTrip };
};
