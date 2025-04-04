import PropTypes from "prop-types";
import TripForm from "./TripForm";
import GoogleMapSection from "./GoogleMapSection";
import TripResults from "./TripResults";
import "../styles/home.css";

const TripFormSection = ({
  formData,
  brandOptions,
  modelOptions,
  availableYears,
  handleBrandSelect,
  handleModelSelect,
  handleYearSelect,
  handleChange,
  calculateTrip,
  errors,
  isLoaded,
  mapCenter,
  markers,
  setMarkers,
  handleLocationChange,
  results,
  user,
  setMapCenter,
}) => {
  return (
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
          errors={errors}
        />
        <button className="calculate-btn mt-3" onClick={calculateTrip}>
          Calcular Viaje
        </button>
      </div>

      {/* Mapa y resultados */}
      <div className="map-results-wrapper">
        {isLoaded && (
          <GoogleMapSection
            isLoaded={isLoaded}
            mapCenter={mapCenter}
            setMapCenter={setMapCenter}
            markers={markers}
            setMarkers={setMarkers}
            handleLocationChange={handleLocationChange}
          />
        )}

        {/* Resultados */}
        {user && results && (
          <div className="results-panel">
            <TripResults results={results} />
          </div>
        )}
      </div>
    </div>
  );
};

TripFormSection.propTypes = {
  formData: PropTypes.object.isRequired,
  brandOptions: PropTypes.array.isRequired,
  modelOptions: PropTypes.array.isRequired,
  availableYears: PropTypes.array.isRequired,
  vehicleDetails: PropTypes.object,
  handleBrandSelect: PropTypes.func.isRequired,
  handleModelSelect: PropTypes.func.isRequired,
  handleYearSelect: PropTypes.func.isRequired,
  handleChange: PropTypes.func.isRequired,
  calculateTrip: PropTypes.func.isRequired,
  errors: PropTypes.object.isRequired,
  isLoaded: PropTypes.bool.isRequired,
  mapCenter: PropTypes.object.isRequired,
  markers: PropTypes.array.isRequired,
  handleLocationChange: PropTypes.func.isRequired,
  setMapCenter: PropTypes.func.isRequired,
  results: PropTypes.object,
  user: PropTypes.object,
  setMarkers: PropTypes.func.isRequired,
};


export default TripFormSection;
