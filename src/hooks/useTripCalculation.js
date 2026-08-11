import { useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config/api";

export const useTripCalculation = (formData) => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState("");

  const calculateTrip = async () => {
    const token = localStorage.getItem("token");
    setCalculationError("");

    if (!token) {
      setCalculationError("Debes iniciar sesión para guardar y calcular un viaje.");
      return null;
    }

    const payload = {
      brand: formData.brand?.toLowerCase(),
      model: formData.model?.toLowerCase(),
      year: Number(formData.year),
      origin: formData.locationCoords,
      destination: formData.destinationCoords,
      route_polyline: formData.route_polyline,
      extra_weight: Number(formData.extraWeight),
      passengers: Number(formData.passengers),
      fuel_price: Number(formData.fuelPrice),
      road_profile: formData.roadProfile,
    };

    if (!payload.route_polyline || !payload.origin || !payload.destination) {
      setCalculationError("Selecciona un origen y destino y espera a que la ruta aparezca en el mapa.");
      return null;
    }

    setIsCalculating(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/trips/calculate-and-save`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return response.data;
    } catch (error) {
      const serviceMessage = error.response?.data?.error;
      setCalculationError(
        serviceMessage ||
          (error.request
            ? "No pudimos conectar con el servidor. Comprueba tu conexión e inténtalo nuevamente."
            : "No fue posible calcular el viaje."),
      );
      return null;
    } finally {
      setIsCalculating(false);
    }
  };

  return { calculateTrip, isCalculating, calculationError, setCalculationError };
};
