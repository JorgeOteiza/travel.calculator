import PropTypes from "prop-types";

const TripForm = ({
  formData,
  brandOptions,
  modelOptions,
  handleBrandSelect,
  handleModelSelect,
  handleChange,
}) => {
  return (
    <form>
      {/* ✅ Campo modificado para mostrar lista de marcas */}
      <label htmlFor="brand">Vehicle Brand</label>
      <select
        name="brand"
        value={formData.brand}
        onChange={(e) => handleBrandSelect(e.target.value)}
      >
        <option value="">Selecciona una marca</option>
        {brandOptions.map((brand, index) => (
          <option key={index} value={brand}>
            {brand}
          </option>
        ))}
      </select>

      {/* ✅ Campo modificado para lista de modelos */}
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

      <label htmlFor="fuelType">Fuel Type</label>
      <input
        type="text"
        name="fuelType"
        value={formData.fuelType}
        onChange={handleChange}
      />

      <label htmlFor="location">Location</label>
      <input
        type="text"
        name="location"
        value={formData.location}
        onChange={handleChange}
      />

      <label htmlFor="destinity">Destination</label>
      <input
        type="text"
        name="destinity"
        value={formData.destinity}
        onChange={handleChange}
      />

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
  setFormData: PropTypes.func.isRequired,
  brandOptions: PropTypes.array.isRequired,
  modelOptions: PropTypes.array.isRequired,
  handleBrandSelect: PropTypes.func.isRequired,
  handleModelSelect: PropTypes.func.isRequired,
  handleChange: PropTypes.func.isRequired,
  calculateTrip: PropTypes.func.isRequired,
};

export default TripForm;
