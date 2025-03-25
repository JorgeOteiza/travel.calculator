import PropTypes from "prop-types";
import TripForm from "../components/TripForm";
import GoogleMapSection from "../components/GoogleMapSection";

const TripFormSection = ({
  formData,
  brandOptions,
  modelOptions,
  handleBrandSelect,
  handleModelSelect,
  handleChange,
  calculateTrip,
  errors,
  isLoaded,
  mapCenter,
  markers,
  setMarkers,
  handleLocationChange,
}) => {
  return (
    <>
      <div className="form-container">
        <TripForm
          formData={formData}
          brandOptions={brandOptions}
          modelOptions={modelOptions}
          handleBrandSelect={handleBrandSelect}
          handleModelSelect={handleModelSelect}
          handleChange={handleChange}
          errors={errors}
        />
        <button className="calculate-btn mt-3" onClick={calculateTrip}>
          Calcular Viaje
        </button>
      </div>

      {isLoaded && (
        <GoogleMapSection
          mapCenter={mapCenter}
          markers={markers}
          setMarkers={setMarkers}
          handleLocationChange={handleLocationChange}
        />
      )}
    </>
  );
};

TripFormSection.propTypes = {
  formData: PropTypes.object.isRequired,
  brandOptions: PropTypes.array.isRequired,
  modelOptions: PropTypes.array.isRequired,
  handleBrandSelect: PropTypes.func.isRequired,
  handleModelSelect: PropTypes.func.isRequired,
  handleChange: PropTypes.func.isRequired,
  calculateTrip: PropTypes.func.isRequired,
  errors: PropTypes.object.isRequired,
  isLoaded: PropTypes.bool.isRequired,
  mapCenter: PropTypes.object.isRequired,
  markers: PropTypes.array.isRequired,
  setMarkers: PropTypes.func.isRequired,
  handleLocationChange: PropTypes.func.isRequired,
};

export default TripFormSection;
