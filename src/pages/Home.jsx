import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import TripForm from "../components/TripForm";
import GoogleMapSection from "../components/GoogleMapSection";
import useTripData from "../hooks/useTripData";
import { useWeather } from "../hooks/useWeather";
import { validateTripForm } from "../hooks/useTripValidation";
import { useTripCalculation } from "../hooks/useTripCalculation";
import { useTripFormHandlers } from "../hooks/useTripFormHandlers";
import { DEFAULT_MAP_CENTER } from "../constants/googleMaps";
import "../styles/home.css";

const Home = () => {
  const navigate = useNavigate();
  const userFromStorage = JSON.parse(localStorage.getItem("user"));
  const {
    formData, setFormData, brandOptions, modelOptions, availableYears,
    vehicleDetails, handleBrandSelect, handleModelSelect, handleYearSelect,
    handleChange, isLoadingBrands, isLoadingModels, dataWarning,
  } = useTripData({
    brand: "", model: "", year: "", fuelType: "", fuelPrice: 0,
    passengers: 1, extraWeight: 0, user: userFromStorage || null,
    locationCoords: null, destinationCoords: null, locationLabel: "",
    destinationLabel: "", climate: "", roadGrade: 0, route_polyline: "",
    currency: "CLP", distanceUnit: "km",
  });

  const { fetchWeather, weatherWarning } = useWeather(setFormData);
  const [mapCenter, setMapCenter] = useState(DEFAULT_MAP_CENTER);
  const [markers, setMarkers] = useState([]);
  const [errors, setErrors] = useState({});
  const [locationStatus, setLocationStatus] = useState("idle");

  const { handleLocationChange } = useTripFormHandlers(
    setFormData, setMapCenter, fetchWeather,
  );

  const requestCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus("unsupported");
      setMapCenter(DEFAULT_MAP_CENTER);
      return;
    }
    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const currentLocation = { lat: coords.latitude, lng: coords.longitude };
        setMapCenter(currentLocation);
        setMarkers((previous) => [currentLocation, previous[1]]);
        handleLocationChange("location", { ...currentLocation, label: "Mi ubicación actual" });
        setLocationStatus("granted");
      },
      () => {
        setMapCenter(DEFAULT_MAP_CENTER);
        setLocationStatus("denied");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  }, [handleLocationChange]);

  const { calculateTrip, isCalculating, calculationError } = useTripCalculation(formData);

  const handleSubmit = async () => {
    const validationErrors = validateTripForm(formData);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    const result = await calculateTrip();
    if (!result) return;
    const enrichedResult = {
      ...result,
      originLabel: formData.locationLabel,
      destinationLabel: formData.destinationLabel,
      settings: { currency: formData.currency, distanceUnit: formData.distanceUnit },
    };
    sessionStorage.setItem("travelCalculator:lastResult", JSON.stringify(enrichedResult));
    navigate("/resultado", { state: { result: enrichedResult } });
  };

  return (
    <div className="home-container">
      <div className="form-map-container no-results">
        <TripForm
          formData={formData} brandOptions={brandOptions} modelOptions={modelOptions}
          availableYears={availableYears} vehicleDetails={vehicleDetails}
          handleBrandSelect={handleBrandSelect} handleModelSelect={handleModelSelect}
          handleYearSelect={handleYearSelect} handleChange={handleChange}
          calculateTrip={handleSubmit} errors={errors} isCalculating={isCalculating}
          isLoadingBrands={isLoadingBrands} isLoadingModels={isLoadingModels}
          message={calculationError || weatherWarning || dataWarning}
        />
        <GoogleMapSection
          mapCenter={mapCenter} markers={markers} setMarkers={setMarkers}
          onLocationChange={handleLocationChange} onRequestLocation={requestCurrentLocation}
          onDeclineLocation={() => setLocationStatus("dismissed")}
          locationStatus={locationStatus}
        />
      </div>
    </div>
  );
};

export default Home;
