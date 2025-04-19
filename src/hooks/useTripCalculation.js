import axios from "axios";

const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export const useTripCalculation = (
  formData,
  setResults,
  vehicleDetails = null
) => {
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

      // 1. Obtener distancia desde backend
      const distanceResponse = await axios.get(
        `${VITE_BACKEND_URL}/api/distance?origin=${originLat},${originLng}&destination=${destLat},${destLng}`
      );
      const distanceKm = distanceResponse.data.distance_km;
      if (!distanceKm) {
        alert("No se pudo calcular la distancia.");
        return;
      }

      // 2. Obtener elevación desde backend
      const elevationResponse = await axios.get(
        `${VITE_BACKEND_URL}/api/elevation?origin=${originLat},${originLng}&destination=${destLat},${destLng}`
      );
      const elevationData = elevationResponse.data.results;
      const elevOrigin = elevationData[0]?.elevation || 0;
      const elevDest = elevationData[1]?.elevation || 0;

      const elevationDiff = elevDest - elevOrigin;
      const distanceMeters = distanceKm * 1000;
      const slopePercent = Number(
        ((elevationDiff / distanceMeters) * 100).toFixed(2)
      );

      // 3. Determinar si es eléctrico
      const isElectric = vehicleDetails?.fuel_type
        ?.toLowerCase()
        .includes("electric");

      // 4. Preparar datos de cálculo
      const tripData = {
        brand: formData.brand.trim().toLowerCase(),
        model: formData.model.trim().toLowerCase(),
        year: parseInt(formData.year),
        totalWeight: Number(formData.totalWeight),
        passengers: parseInt(formData.passengers),
        distance: distanceKm,
        roadGrade: slopePercent,
        weather: formData.climate,
        ...(vehicleDetails && {
          lkm_mixed: vehicleDetails.lkm_mixed,
          weight_kg: vehicleDetails.weight_kg,
        }),
        ...(!isElectric && {
          fuelPrice: parseFloat(formData.fuelPrice),
        }),
      };

      // 5. Cálculo del viaje
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

      setResults({
        ...calcResponse.data,
        weather: formData.climate,
        roadSlope: `${slopePercent}%`,
      });

      // 6. Guardar viaje
      const savePayload = {
        brand: formData.brand,
        model: formData.model,
        year: formData.year,
        fuel_type: vehicleDetails?.fuel_type || "unknown",
        total_weight: parseFloat(formData.totalWeight),
        passengers: parseInt(formData.passengers),
        location: formData.location,
        distance: calcResponse.data.distance,
        fuel_consumed: calcResponse.data.fuelUsed,
        total_cost: calcResponse.data.totalCost,
        road_grade: slopePercent,
        weather: formData.climate,
        ...(isElectric ? {} : { fuel_price: parseFloat(formData.fuelPrice) }),
      };

      const saveResponse = await axios.post(
        `${VITE_BACKEND_URL}/api/trips`,
        savePayload,
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
