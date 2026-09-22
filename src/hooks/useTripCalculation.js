import { useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config/api";

// Construye el payload una sola vez a partir del formulario. Es el mismo
// objeto para ambos endpoints (público y autenticado): lo único que cambia
// entre ellos es la URL y la cabecera Authorization, nunca los datos del
// cálculo. Nunca incluye user_id ni vehicle_id: el backend los ignoraría
// igualmente, pero ni siquiera se construyen aquí.
const buildPayload = (formData) => {
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
  return formData.isCustomVehicle
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
};

// Traduce la respuesta de error de la API a un mensaje para el usuario,
// distinguiendo los casos que el backend puede devolver (ver Checkpoint de
// seguridad del endpoint público): 400 validación, 413 payload muy grande,
// 429 límite de solicitudes, 500/red indisponibilidad del servicio. Nunca
// da a entender que el viaje se guardó cuando en realidad falló.
const resolveErrorMessage = (error) => {
  const status = error.response?.status;
  const serviceMessage = error.response?.data?.error;

  if (status === 429) {
    return serviceMessage || "Estás calculando demasiado rápido. Espera un momento antes de volver a intentarlo.";
  }
  if (status === 413) {
    return serviceMessage || "La solicitud es demasiado grande para procesarla.";
  }
  if (status === 400 || status === 422) {
    return serviceMessage || "Revisa los datos del viaje: algunos parámetros no son válidos.";
  }
  if (status >= 500) {
    return serviceMessage || "El servicio de cálculo no está disponible en este momento. Inténtalo nuevamente en unos minutos.";
  }
  if (error.request && !error.response) {
    return "No pudimos conectar con el servidor. Comprueba tu conexión e inténtalo nuevamente.";
  }
  return serviceMessage || "No fue posible calcular el viaje.";
};

export const useTripCalculation = (formData) => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState("");

  const calculateTrip = async () => {
    setCalculationError("");

    const payload = buildPayload(formData);
    if (!payload.route_polyline || !payload.origin || !payload.destination) {
      setCalculationError("Selecciona un origen y destino y espera a que la ruta aparezca en el mapa.");
      return null;
    }

    const token = localStorage.getItem("token");

    setIsCalculating(true);
    try {
      // Sin sesión: directo al cálculo público, sin cabecera Authorization.
      if (!token) {
        try {
          const response = await axios.post(`${API_BASE_URL}/api/trips/calculate`, payload);
          return response.data;
        } catch (error) {
          setCalculationError(resolveErrorMessage(error));
          return null;
        }
      }

      // Con sesión: calculate-and-save, igual que hasta ahora.
      try {
        const response = await axios.post(
          `${API_BASE_URL}/api/trips/calculate-and-save`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        return response.data;
      } catch (error) {
        if (error.response?.status !== 401) {
          setCalculationError(resolveErrorMessage(error));
          return null;
        }

        // Sesión expirada o token inválido: NO se llama a handleAuthError()
        // aquí a propósito. handleAuthError() cierra sesión y redirige a
        // /login, lo que en este flujo perdería los datos ya ingresados en
        // el formulario. En vez de eso, reutilizamos el mismo payload — sin
        // pedir de nuevo los datos — contra el endpoint público, una única
        // vez (sin reintentos en bucle). El resultado se marca con
        // sessionExpired para que la página de resultado explique lo
        // ocurrido; el manejo de sesión expirada de perfil/historial no se
        // toca y sigue usando handleAuthError() como hasta ahora.
        try {
          const fallback = await axios.post(`${API_BASE_URL}/api/trips/calculate`, payload);
          return { ...fallback.data, sessionExpired: true };
        } catch (fallbackError) {
          setCalculationError(resolveErrorMessage(fallbackError));
          return null;
        }
      }
    } finally {
      setIsCalculating(false);
    }
  };

  return { calculateTrip, isCalculating, calculationError, setCalculationError };
};
