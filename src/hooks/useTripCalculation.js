import axios from "axios";
import { API_BASE_URL } from "../config/api";

export const useTripCalculation = (formData, setResults, vehicleDetails) => {
  const calculateTrip = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      alert("Usuario no autenticado. Inicia sesión para continuar.");
      return;
    }

    try {
      // 📍 Validación defensiva
      if (
        !formData.locationCoords ||
        !formData.destinationCoords ||
        typeof formData.locationCoords.lat !== "number" ||
        typeof formData.destinationCoords.lat !== "number"
      ) {
        alert("Debes seleccionar origen y destino en el mapa.");
        return;
      }

      const { lat: originLat, lng: originLng } = formData.locationCoords;
      const { lat: destLat, lng: destLng } = formData.destinationCoords;

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      // 📏 Distancia
      const distRes = await axios.get(`${API_BASE_URL}/api/distance`, {
        params: {
          origin: `${originLat},${originLng}`,
          destination: `${destLat},${destLng}`,
        },
        headers,
      });

      const distanceKm = distRes.data?.distance_km;
      if (typeof distanceKm !== "number") {
        throw new Error("No se pudo calcular la distancia.");
      }

      // 🏔️ Elevación
      const elevRes = await axios.get(`${API_BASE_URL}/api/elevation`, {
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

      // 🌦️ Clima
      const weatherRes = await axios.get(`${API_BASE_URL}/api/weather`, {
        params: { lat: originLat, lng: originLng },
        headers,
      });

      const climate = weatherRes.data?.climate || "mild";

      const isElectric =
        vehicleDetails?.fuel_type &&
        vehicleDetails.fuel_type.toLowerCase().includes("electric");

      // 🧮 Payload de cálculo (API /calculate)
      const payload = {
        brand: formData.brand.toLowerCase(),
        model: formData.model.toLowerCase(),
        year: parseInt(formData.year),
        totalWeight: Number(formData.totalWeight),
        passengers: Number(formData.passengers),
        distance: distanceKm,
        roadGrade: slopePercent,
        climate,

        // ✅ Normalización requerida por backend
        location: formData.locationCoords,
        destination: formData.destinationCoords,

        ...(vehicleDetails && {
          lkm_mixed: vehicleDetails.lkm_mixed,
          weight_kg: vehicleDetails.weight_kg,
        }),
        ...(!isElectric && {
          fuelPrice: Number(formData.fuelPrice),
        }),
      };

      const calcRes = await axios.post(
        `${API_BASE_URL}/api/calculate`,
        payload,
        { headers }
      );

      // 📊 Resultados UI
      setResults({
        // datos base del cálculo
        distance: calcRes.data.distance,
        fuelUsed: calcRes.data.fuelUsed,
        totalCost: calcRes.data.totalCost,

        // consumo
        baseFC: calcRes.data.baseFC,
        adjustedFC: calcRes.data.adjustedFC,
        pricePerLitre: isElectric ? null : Number(formData.fuelPrice),

        // clima
        weather: climate,
        climate,
        weatherRaw: weatherRes.data || null,

        // ruta
        roadSlope: `${slopePercent}%`,
        origin: formData.locationLabel,
        destination: formData.destinationLabel,

        // vehículo
        vehicleDetails,
      });

      // 💾 Guardar viaje (API /trips)
      const savePayload = {
        brand: formData.brand,
        model: formData.model,
        year: formData.year,
        fuel_type: vehicleDetails?.fuel_type || "unknown",
        total_weight: Number(formData.totalWeight),
        passengers: Number(formData.passengers),

        // ✅ STRING → compatible con PostgreSQL
        location: formData.locationLabel,

        distance: calcRes.data.distance,
        fuel_consumed: calcRes.data.fuelUsed,
        total_cost: calcRes.data.totalCost,
        road_grade: slopePercent,
        climate,
        ...(isElectric ? {} : { fuel_price: Number(formData.fuelPrice) }),
      };

      await axios.post(`${API_BASE_URL}/api/trips`, savePayload, { headers });

      console.log("✅ Viaje calculado y guardado correctamente");
    } catch (error) {
      const msg =
        error.response?.data?.error || error.message || "Error desconocido";
      console.error("🚨 Error en cálculo:", msg);
      alert(msg);
    }
  };

  return { calculateTrip };
};
