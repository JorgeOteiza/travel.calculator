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
      if (!formData.location || !formData.destinity) {
        alert("Debes seleccionar origen y destino en el mapa.");
        return;
      }

      const [originLat, originLng] = formData.location.split(",").map(Number);
      const [destLat, destLng] = formData.destinity.split(",").map(Number);

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      const distRes = await axios.get(`${VITE_BACKEND_URL}/api/distance`, {
        params: {
          origin: `${originLat},${originLng}`,
          destination: `${destLat},${destLng}`,
        },
        headers,
      });

      const distanceKm = distRes.data?.distance_km;
      if (!distanceKm) {
        alert("No se pudo calcular la distancia.");
        return;
      }

      const elevRes = await axios.get(`${VITE_BACKEND_URL}/api/elevation`, {
        params: {
          origin: `${originLat},${originLng}`,
          destination: `${destLat},${destLng}`,
        },
        headers,
      });

      const elevOrigin = elevRes.data.results?.[0]?.elevation ?? 0;
      const elevDest = elevRes.data.results?.[1]?.elevation ?? 0;
      const elevationDiff = elevDest - elevOrigin;
      const slopePercent = Number(
        ((elevationDiff / (distanceKm * 1000)) * 100).toFixed(2)
      );

      // ✅ Obtener clima desde el backend
      const weatherRes = await axios.get(`${VITE_BACKEND_URL}/api/weather`, {
        params: { lat: originLat, lng: originLng },
        headers,
      });

      const climate = weatherRes.data?.climate || "mild";

      const isElectric = vehicleDetails?.fuel_type
        ?.toLowerCase()
        .includes("electric");

      const payload = {
        brand: formData.brand.trim().toLowerCase(),
        model: formData.model.trim().toLowerCase(),
        year: parseInt(formData.year),
        totalWeight: parseFloat(formData.totalWeight),
        passengers: parseInt(formData.passengers),
        distance: distanceKm,
        roadGrade: slopePercent,
        climate,
        ...(vehicleDetails && {
          lkm_mixed: vehicleDetails.lkm_mixed,
          weight_kg: vehicleDetails.weight_kg,
        }),
        ...(!isElectric && {
          fuelPrice: parseFloat(formData.fuelPrice),
        }),
      };

      const calcRes = await axios.post(
        `${VITE_BACKEND_URL}/api/calculate`,
        payload,
        { headers }
      );

      setResults({
        ...calcRes.data,
        climate,
        roadSlope: `${slopePercent}%`,
      });

      const savePayload = {
        brand: formData.brand,
        model: formData.model,
        year: formData.year,
        fuel_type: vehicleDetails?.fuel_type || "unknown",
        total_weight: parseFloat(formData.totalWeight),
        passengers: parseInt(formData.passengers),
        location: formData.location,
        distance: calcRes.data.distance,
        fuel_consumed: calcRes.data.fuelUsed,
        total_cost: calcRes.data.totalCost,
        road_grade: slopePercent,
        climate,
        ...(isElectric ? {} : { fuel_price: parseFloat(formData.fuelPrice) }),
      };

      await axios.post(`${VITE_BACKEND_URL}/api/trips`, savePayload, {
        headers,
      });

      console.log("✅ Viaje calculado y guardado correctamente.");
    } catch (error) {
      const msg = error.response?.data?.error || error.message;
      console.error("🚨 Error en cálculo o guardado:", msg);
      alert(msg);
    }
  };

  return { calculateTrip };
};
