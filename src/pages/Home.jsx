import { useState, useEffect } from "react";
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
    extraWeight: 0,
    user: userFromStorage || null,
    locationCoords: null,
    destinationCoords: null,
    locationLabel: "",
    destinationLabel: "",
    climate: "",
    roadGrade: 0,
    route_polyline: "", // 🔥 FIX
  });

  const { fetchWeather } = useWeather(setFormData);

  const [results, setResults] = useState(null);
  const [mapCenter, setMapCenter] = useState(DEFAULT_MAP_CENTER);
  const [markers, setMarkers] = useState([]);
  const [errors, setErrors] = useState({});

  const hasResults = Boolean(results);

  useEffect(() => {
    console.log("🖥️ results en Home:", results);
  }, [results]);

  const { handleLocationChange } = useTripFormHandlers(
    formData,
    setFormData,
    setMapCenter,
    fetchWeather,
  );

  const { calculateTrip } = useTripCalculation(
    formData,
    setResults,
    vehicleDetails,
  );

  const handleSubmit = async () => {
    const validationErrors = validateTripForm(formData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    if (!formData.route_polyline) {
      alert("La ruta aún no está lista, espera un segundo");
      return;
    }

    console.log("📦 Datos enviados:", formData);

    await calculateTrip();
  };

  return (
    <div className="home-container">
      <div
        className={`form-map-container ${
          hasResults ? "with-results" : "no-results"
        }`}
      >
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

        <GoogleMapSection
          mapCenter={mapCenter}
          markers={markers}
          setMarkers={setMarkers}
          onLocationChange={handleLocationChange}
        />

        {hasResults && (
          <div className="results-panel">
            <TripResults results={results} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
