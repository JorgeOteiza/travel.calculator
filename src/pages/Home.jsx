import { useJsApiLoader } from "@react-google-maps/api";
import { useState } from "react";
import TripFormSection from "../components/TripFormSection";
import useTripData from "../hooks/useTripData";
import { useWeather } from "../hooks/useWeather";
import { validateTripForm } from "../hooks/useTripValidation";
import { useTripCalculation } from "../hooks/useTripCalculation";
import { useTripFormHandlers } from "../hooks/useTripFormHandlers";
import { GOOGLE_MAPS_LIBRARIES } from "../constants/googleMaps";
import "../styles/home.css";
import { DEFAULT_MAP_CENTER } from "../constants/googleMaps";

const VITE_GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const Home = () => {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: VITE_GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

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
      alert("Por favor ingresa todos los datos correctamente.");
    }
  };

  if (loadError) return <div>Error al cargar Google Maps</div>;

  return (
    <div className="home-container">
      {!formData.user && (
        <div className="login-warning">
          🔐 Debes iniciar sesión para guardar tu viaje.
        </div>
      )}

      <TripFormSection
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
        isLoaded={isLoaded}
        mapCenter={mapCenter}
        setMapCenter={setMapCenter}
        markers={markers}
        setMarkers={setMarkers}
        handleLocationChange={handleLocationChange}
        results={results}
        user={formData.user}
      />
    </div>
  );
};

export default Home;
