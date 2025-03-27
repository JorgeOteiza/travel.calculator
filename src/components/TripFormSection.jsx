import PropTypes from "prop-types";
import TripForm from "../components/TripForm";
import GoogleMapSection from "../components/GoogleMapSection";

const TripFormSection = ({
  formData,
  brandOptions,
  modelOptions,
  vehicleDetails,
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
          handleYearSelect={handleYearSelect}
          handleChange={handleChange}
          errors={errors}
        />
        {vehicleDetails && (
          <div className="vehicle-details">
            <h3>Detalles del Vehículo</h3>
            <p>Marca: {vehicleDetails.make}</p>
            <p>Modelo: {vehicleDetails.model}</p>
            <p>Año: {vehicleDetails.year}</p>
            <p>Tipo de combustible: {vehicleDetails.fuel_type}</p>
            <p>Consumo mixto: {vehicleDetails.lkm_mixed} L/100km</p>
            {/* Otros detalles según sea necesario */}
          </div>
        )}
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
  setMarkers: PropTypes.func.isRequired,
  handleLocationChange: PropTypes.func.isRequired,
};

export default TripFormSection;
