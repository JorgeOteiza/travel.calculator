import { useState } from "react";
import TripForm from "../components/TripForm";
import GoogleMapSection from "../components/GoogleMapSection";
import TripResults from "../components/TripResults";
import useTripData from "../hooks/useTripData";
import { useWeather } from "../hooks/useWeather";
import { validateTripForm } from "../hooks/useTripValidation";
import { useTripCalculation } from "../hooks/useTripCalculation";
import { useTripFormHandlers } from "../hooks/useTripFormHandlers";
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
    vehicleDetails
  );

  const { handleLocationChange } = useTripFormHandlers(
    formData,
    setFormData,
    setMapCenter,
    fetchWeather
  );

  const handleSubmit = () => {
    const validationErrors = validateTripForm(formData);
    setErrors(validationErrors);

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
        {/* Formulario */}
        <div className="form-container">
          <TripForm
            formData={formData}
            brandOptions={brandOptions}
            modelOptions={modelOptions}
            availableYears={availableYears}
            handleBrandSelect={handleBrandSelect}
            handleModelSelect={handleModelSelect}
            handleYearSelect={handleYearSelect}
            handleChange={handleChange}
            calculateTrip={handleSubmit}
            errors={errors}
          />
        </div>

        {/* Mapa y resultados */}
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
