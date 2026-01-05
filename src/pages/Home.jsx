import { useState, useCallback } from "react";
import TripForm from "../components/TripForm";
import GoogleMapSection from "../components/GoogleMapSection";
import TripResults from "../components/TripResults";
import useTripData from "../hooks/useTripData";
import { useWeather } from "../hooks/useWeather";
import { validateTripForm } from "../hooks/useTripValidation";
import { useTripCalculation } from "../hooks/useTripCalculation";
import { DEFAULT_MAP_CENTER } from "../constants/googleMaps";
import "../styles/home.css";

const Home = () => {
  const userFromStorage = JSON.parse(localStorage.getItem("user"));

  const {
    formData,
    setFormData,
    brandOptions,
    modelOptions,
    availableYears,
    vehicleDetails,
    handleBrandSelect,
    handleModelSelect,
    handleYearSelect,
    handleChange,
  } = useTripData({
    brand: "",
    model: "",
    year: "",
    fuelType: "",
    fuelPrice: 0,
    passengers: 1,
    totalWeight: 0,
    user: userFromStorage || null,
    location: "",
    destinity: "",
    climate: "",
    roadGrade: 0,
  });

  const { fetchWeather } = useWeather(setFormData);

  const [results, setResults] = useState(null);
  const [mapCenter, setMapCenter] = useState(DEFAULT_MAP_CENTER);
  const [markers, setMarkers] = useState([]);
  const [errors, setErrors] = useState({});

  const { calculateTrip } = useTripCalculation(
    formData,
    setResults,
    vehicleDetails,
    fetchWeather
  );

  const handleLocationChange = useCallback(
    async (field, coords) => {
      console.log(
        `handleLocationChange llamado con field: ${field}, coords:`,
        coords
      );

      if (!coords?.lat || !coords?.lng) {
        console.error("Coordenadas inválidas recibidas:", coords);
        return;
      }

      if (typeof setFormData !== "function") {
        console.error("setFormData no es una función válida.");
        return;
      }

      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.lat},${coords.lng}&key=YOUR_GOOGLE_MAPS_API_KEY`
        );
        const data = await response.json();

        if (data.status === "OK" && data.results.length > 0) {
          const placeName = data.results[0].formatted_address;
          console.log(`Nombre del lugar obtenido: ${placeName}`);

          setFormData((prev) => {
            const updatedFormData = { ...prev, [field]: placeName };
            console.log(
              "formData actualizado con nombre del lugar:",
              updatedFormData
            );
            return updatedFormData;
          });

          if (field === "location") {
            setMapCenter(coords);
            fetchWeather(coords.lat, coords.lng);
          }
        } else {
          console.error("No se pudo obtener el nombre del lugar:", data);
        }
      } catch (error) {
        console.error("Error al realizar la geocodificación inversa:", error);
      }
    },
    [setFormData, setMapCenter, fetchWeather]
  );

  const handleSubmit = () => {
    const validationErrors = validateTripForm(formData);
    setErrors(validationErrors);

    console.log("Datos enviados a validateTripForm:", formData);

    if (Object.keys(validationErrors).length === 0) {
      calculateTrip();
    } else {
      alert("Por favor completa todos los campos requeridos correctamente.");
    }
  };

  return (
    <div className="home-container">
      {!formData.user && (
        <div className="login-warning">
          🔐 Debes iniciar sesión para guardar tu viaje.
        </div>
      )}

      <div className="form-map-container">
        <div className="form-container">
          <TripForm
            formData={formData}
            brandOptions={brandOptions}
            modelOptions={modelOptions}
            availableYears={availableYears}
            vehicleDetails={vehicleDetails}
            handleBrandSelect={handleBrandSelect}
            handleModelSelect={handleModelSelect}
            handleYearSelect={handleYearSelect}
            handleChange={handleChange}
            calculateTrip={handleSubmit}
            errors={errors}
          />
        </div>

        <div className="map-results-wrapper">
          <GoogleMapSection
            mapCenter={mapCenter}
            setMapCenter={setMapCenter}
            markers={markers}
            setMarkers={setMarkers}
            handleLocationChange={handleLocationChange}
          />

          {results && (
            <div className="results-panel">
              <TripResults results={results} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
