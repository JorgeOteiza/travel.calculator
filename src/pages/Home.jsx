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
    brand: "", model: "", year: "", fuelType: "", fuelPrice: "",
    consumptionMode: "standard", userConsumptionKml: "", consumptionReferenceProfile: "city",
    passengers: 1, extraWeight: 0, user: userFromStorage || null,
    locationCoords: null, destinationCoords: null, locationLabel: "",
    destinationLabel: "", climate: "", roadGrade: 0, route_polyline: "",
    currency: "CLP", distanceUnit: "km", roadProfile: "mixed", drivingStyle: "moderate",
  });

  const { fetchWeather, weatherWarning } = useWeather(setFormData);
  const [mapCenter, setMapCenter] = useState(DEFAULT_MAP_CENTER);
  const [markers, setMarkers] = useState([]);
  const [errors, setErrors] = useState({});
  const [locationStatus, setLocationStatus] = useState("idle");
  const [isFormExpanded, setIsFormExpanded] = useState(true);

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
        handleLocationChange("location", { ...currentLocation, label: "Ubicación detectada" });
        setLocationStatus("granted");
      },
      () => {
        setMapCenter(DEFAULT_MAP_CENTER);
        setLocationStatus("denied");
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 900000 },
    );
  }, [handleLocationChange]);

  const handleCurrentAddressResolved = useCallback((address) => {
    setFormData((previous) => ({ ...previous, locationLabel: address }));
  }, [setFormData]);

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

  const vehicleSummary = formData.brand && formData.model
    ? `${formData.brand} ${formData.model}${formData.year ? ` · ${formData.year}` : ""}`
    : "Configura vehículo, consumo y carga";

  const showTripForm = () => {
    setIsFormExpanded(true);
    window.requestAnimationFrame(() => {
      document.getElementById("trip-form-section")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  return (
    <div className="home-container">
      <nav className="calculator-shortcuts" aria-label="Secciones de la calculadora"><button type="button" onClick={showTripForm}>Datos del viaje</button><a href="#trip-map-section">Origen y destino</a></nav>
      <div className="form-map-container no-results">
        <section id="trip-form-section" className={`form-section-anchor collapsible-trip-panel${isFormExpanded ? " is-expanded" : " is-collapsed"}`}>
        <button type="button" className="trip-panel-toggle" onClick={() => setIsFormExpanded((expanded) => !expanded)} aria-expanded={isFormExpanded} aria-controls="trip-form-content">
          <span><small>Datos del viaje</small><strong>{isFormExpanded ? "Ocultar formulario" : vehicleSummary}</strong></span>
          <i aria-hidden="true">⌃</i>
        </button>
        <div id="trip-form-content" className="trip-form-collapsible" aria-hidden={!isFormExpanded}>
          <TripForm
          formData={formData} brandOptions={brandOptions} modelOptions={modelOptions}
          availableYears={availableYears} vehicleDetails={vehicleDetails}
          handleBrandSelect={handleBrandSelect} handleModelSelect={handleModelSelect}
          handleYearSelect={handleYearSelect} handleChange={handleChange}
          calculateTrip={handleSubmit} errors={errors} isCalculating={isCalculating}
          isLoadingBrands={isLoadingBrands} isLoadingModels={isLoadingModels}
          message={calculationError || weatherWarning || dataWarning}
          />
        </div>
        </section>
        <div id="trip-map-section" className="map-section-anchor"><GoogleMapSection
          mapCenter={mapCenter} markers={markers} setMarkers={setMarkers}
          onLocationChange={handleLocationChange} onRequestLocation={requestCurrentLocation}
          onDeclineLocation={() => setLocationStatus("dismissed")}
          onCurrentAddressResolved={handleCurrentAddressResolved}
          locationStatus={locationStatus}
        /></div>
      </div>
    </div>
  );
};

export default Home;
