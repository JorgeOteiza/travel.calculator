import PropTypes from "prop-types";
import Select from "react-select";

const TripForm = ({
  formData,
  brandOptions,
  modelOptions,
  fetchCarBrands,
  handleBrandSelect,
  handleModelSelect,
  handleChange,
  calculateTrip,
}) => {
  return (
    <form>
      <label>Vehicle Brand</label>
      <Select
        options={brandOptions}
        onInputChange={fetchCarBrands}
        onChange={handleBrandSelect}
        placeholder="Type a vehicle brand..."
      />

      <label>Vehicle Model</label>
      <Select
        options={modelOptions}
        onChange={handleModelSelect}
        placeholder="Select a vehicle model"
      />

      <label>Fuel Type</label>
      <select name="fuelType" value={formData.fuelType} onChange={handleChange}>
        <option value="gasoline">Gasoline</option>
        <option value="diesel">Diesel</option>
        <option value="electric">Electric</option>
      </select>

      <label>Numbers of Passengers</label>
      <input
        type="number"
        name="passengers"
        value={formData.passengers}
        min="1"
        max="50"
        onChange={handleChange}
      />

      <label>Location (Origin)</label>
      <input
        type="text"
        name="location"
        value={formData.location}
        onChange={handleChange}
      />

      <label>Destinity (Destination)</label>
      <input
        type="text"
        name="destinity"
        value={formData.destinity}
        onChange={handleChange}
      />

      <button className="mt-3" type="button" onClick={calculateTrip}>
        Calculate Trip
      </button>
    </form>
  );
};

TripForm.propTypes = {
  formData: PropTypes.object.isRequired,
  setFormData: PropTypes.func.isRequired,
  brandOptions: PropTypes.array.isRequired,
  modelOptions: PropTypes.array.isRequired,
  fetchCarBrands: PropTypes.func.isRequired,
  handleBrandSelect: PropTypes.func.isRequired,
  handleModelSelect: PropTypes.func.isRequired,
  handleChange: PropTypes.func.isRequired,
  calculateTrip: PropTypes.func.isRequired,
};

export default TripForm;
