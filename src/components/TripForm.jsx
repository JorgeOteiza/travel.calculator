import PropTypes from "prop-types";
import Select from "react-select";

const TripForm = ({
  formData,
  brandOptions,
  modelOptions,
  vehicleOptions,
  handleBrandSelect,
  handleModelSelect,
  handleVehicleSelect,
  handleChange,
  handleCurrentLocation,
}) => {
  const brandSelectOptions = brandOptions.map((brand) => ({
    value: brand,
    label: brand,
  }));

  return (
    <form>
      {/* ✅ Selector de marca con búsqueda */}
      <label htmlFor="brand">Vehicle Brand</label>
      <Select
        id="brand"
        name="brand"
        options={brandSelectOptions}
        value={brandSelectOptions.find(
          (option) => option.value === formData.brand
        )}
        onChange={(selectedOption) =>
          handleBrandSelect(selectedOption ? selectedOption.value : "")
        }
        placeholder="Escribe o selecciona una marca"
        isClearable
      />

      {/* ✅ Lista de modelos */}
      <label htmlFor="model">Vehicle Model</label>
      <select
        name="model"
        value={formData.model}
        onChange={(e) => handleModelSelect(e.target.value)}
      >
        <option value="">Selecciona un modelo</option>
        {modelOptions.map((model, index) => (
          <option key={index} value={model}>
            {model}
          </option>
        ))}
      </select>

      {/* ✅ Lista de vehículos */}
      <label htmlFor="vehicle">Vehicle</label>
      <select
        name="vehicle"
        value={formData.vehicle}
        onChange={(e) => handleVehicleSelect(e.target.value)}
      >
        <option value="">Selecciona un vehículo</option>
        {vehicleOptions.map((vehicle, index) => (
          <option key={index} value={vehicle}>
            {vehicle}
          </option>
        ))}
      </select>

      {/* ✅ Selector de tipo de combustible */}
      <label htmlFor="fuelType">Fuel Type</label>
      <select name="fuelType" value={formData.fuelType} onChange={handleChange}>
        <option value="">-</option>
        <option value="gasoline">Gasoline</option>
        <option value="oil">Oil</option>
        <option value="electric">Electric</option>
      </select>

      {/* ✅ Campo de ubicación con botón */}
      <label htmlFor="location">Location</label>
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <input
          type="text"
          name="location"
          value={formData.location}
          onChange={handleChange}
          placeholder="Escribe tu ubicación"
          style={{ flex: 1 }}
        />
        <button
          type="button"
          onClick={handleCurrentLocation}
          style={{
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            border: "1px solid #ccc",
            background: "#f9f9f9",
            cursor: "pointer",
          }}
        >
          📍
        </button>
      </div>

      {/* ✅ Campo de destino */}
      <label htmlFor="destinity">Destination</label>
      <input
        type="text"
        name="destinity"
        value={formData.destinity}
        onChange={handleChange}
      />

      {/* ✅ Campo de pasajeros */}
      <label htmlFor="passengers">Passengers</label>
      <input
        type="number"
        name="passengers"
        value={formData.passengers}
        onChange={handleChange}
      />
    </form>
  );
};

TripForm.propTypes = {
  formData: PropTypes.object.isRequired,
  brandOptions: PropTypes.array.isRequired,
  modelOptions: PropTypes.array.isRequired,
  vehicleOptions: PropTypes.array.isRequired,
  handleBrandSelect: PropTypes.func.isRequired,
  handleModelSelect: PropTypes.func.isRequired,
  handleVehicleSelect: PropTypes.func.isRequired,
  handleChange: PropTypes.func.isRequired,
  handleCurrentLocation: PropTypes.func.isRequired, // Validación de la nueva prop
};

export default TripForm;
