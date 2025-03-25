import { useState } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import TripForm from "../components/TripForm";
import TripResults from "../components/TripResults";
import GoogleMapComponent from "../components/GoogleMapComponent";
import { useTripData } from "../hooks/useTripData";
import { useWeather } from "../hooks/useWeather";
import { validateTripForm } from "../hooks/useTripValidation";
import { useTripCalculation } from "../hooks/useTripCalculation";
import { useTripFormHandlers } from "../hooks/useTripFormHandlers";
import "../styles/home.css";

const VITE_GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const Home = () => {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: VITE_GOOGLE_MAPS_API_KEY,
    libraries: ["places"],
  });

  const [formData, setFormData] = useState({
    brand: "",
    model: "",
    year: "2022",
    fuelType: "",
    fuelPrice: 0,
    passengers: 1,
    totalWeight: 0,
    location: "",
    destinity: "",
    climate: "",
  });

  const [results, setResults] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 37.7749, lng: -122.4194 });
  const [markers, setMarkers] = useState([]);
  const [errors, setErrors] = useState({});

  const { user, brandOptions, modelOptions } = useTripData(formData);
  const { fetchWeather } = useWeather(setFormData);
  const { calculateTrip } = useTripCalculation(formData, setResults);
  const {
    handleChange,
    handleBrandSelect,
    handleModelSelect,
    handleLocationChange,
  } = useTripFormHandlers(formData, setFormData, setMapCenter, fetchWeather);

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
      <div className="form-container">
        <TripForm
          formData={formData}
          brandOptions={brandOptions || []}
          modelOptions={modelOptions || []}
          handleBrandSelect={handleBrandSelect}
          handleModelSelect={handleModelSelect}
          handleChange={handleChange}
          errors={errors}
        />
        <button className="calculate-btn mt-3" onClick={handleSubmit}>
          Calcular Viaje
        </button>
      </div>

      {isLoaded && (
        <GoogleMapComponent
          isLoaded={isLoaded}
          mapCenter={mapCenter}
          markers={markers}
          setMarkers={setMarkers}
          handleLocationChange={handleLocationChange}
        />
      )}

      {!user && (
        <p className="warning-message">
          🔐 Debes iniciar sesión para guardar tu viaje.
        </p>
      )}

      {results && <TripResults results={results} />}
    </div>
  );
};

export default Home;
