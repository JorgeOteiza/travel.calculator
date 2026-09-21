import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api";
import { handleAuthError } from "../utils/auth";

export const useTripCalculation = (formData) => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState("");
  const navigate = useNavigate();

  const calculateTrip = async () => {
    const token = localStorage.getItem("token");
    setCalculationError("");

    if (!token) {
      setCalculationError("Debes iniciar sesión para guardar y calcular un viaje.");
      return null;
    }

    // Comunes a ambos modos (catálogo y vehículo personalizado). Nunca se
    // incluye user_id ni vehicle_id: el backend los ignora si llegaran, pero
    // ni siquiera los construimos aquí.
    const basePayload = {
      origin: formData.locationCoords,
      destination: formData.destinationCoords,
      origin_label: formData.locationLabel,
      destination_label: formData.destinationLabel,
      route_polyline: formData.route_polyline,
      extra_weight: Number(formData.extraWeight),
      passengers: Number(formData.passengers),
      fuel_price: Number(formData.fuelPrice),
      road_profile: formData.roadProfile,
      driving_style: formData.drivingStyle,
      local_hour: new Date().getHours(),
    };

    // El modo se decide exclusivamente por la elección explícita del usuario
    // en el formulario (formData.isCustomVehicle) — nunca se infiere de un
    // 404 ni de la ausencia de un vehículo.
    const payload = formData.isCustomVehicle
      ? {
          ...basePayload,
          is_custom_vehicle: true,
          custom_vehicle: {
            brand: formData.customBrand?.trim(),
            model: formData.customModel?.trim(),
            year: Number(formData.customYear),
            fuel_type: formData.customFuelType,
          },
          // El octanaje solo tiene sentido para gasolina; en diésel no se envía.
          fuel_octane: formData.customFuelType === "gasoline" ? formData.fuelType : null,
          consumption_mode: "custom",
          consumption_value: Number(formData.customConsumptionValue),
          consumption_unit: formData.customConsumptionUnit,
          consumption_reference_profile: formData.customConsumptionReferenceProfile,
        }
      : {
          ...basePayload,
          brand: formData.brand?.toLowerCase(),
          model: formData.model?.toLowerCase(),
          year: Number(formData.year),
          fuel_octane: formData.fuelType,
          consumption_mode: formData.consumptionMode,
          user_consumption_kml: formData.consumptionMode === "custom"
            ? Number(formData.userConsumptionKml)
            : null,
          consumption_reference_profile: formData.consumptionMode === "custom"
            ? formData.consumptionReferenceProfile
            : null,
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
      if (handleAuthError(error, navigate)) {
        setCalculationError("Tu sesión expiró. Inicia sesión nuevamente.");
        return null;
      }
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
