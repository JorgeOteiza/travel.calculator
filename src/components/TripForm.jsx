import PropTypes from "prop-types";
import Select from "react-select";
import "../styles/TripForm.css";

const TripForm = ({
  formData,
  brandOptions,
  modelOptions,
  handleBrandSelect,
  handleModelSelect,
  handleChange,
}) => {
  const fuelTypeOptions = [
    { label: "Gasoline 93", value: "gasoline_93" },
    { label: "Gasoline 95", value: "gasoline_95" },
    { label: "Gasoline 97", value: "gasoline_97" },
  ];

  return (
    <form className="trip-form">
      <label htmlFor="brand">Vehicle Brand</label>
      <Select
        id="brand"
        name="brand"
        options={brandOptions}
        value={brandOptions.find((option) => option.value === formData.brand)}
        onChange={handleBrandSelect}
        placeholder="Select a brand"
        isClearable
        className="custom-select"
      />

      <label htmlFor="model">Vehicle Model</label>
      <Select
        id="model"
        name="model"
        options={modelOptions}
        value={modelOptions.find((option) => option.value === formData.model)}
        onChange={handleModelSelect}
        placeholder="Select a model"
        isClearable
        className="custom-select"
      />

      <label htmlFor="year">Vehicle Year</label>
      <select
        id="year"
        name="year"
        value={formData.year}
        onChange={handleChange}
        className="custom-input"
      >
        <option value="">Select year</option>
        {Array.from({ length: 35 }, (_, i) => 2025 - i).map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>

      <label htmlFor="fuelType">Octane rating</label>
      <Select
        id="fuelType"
        name="fuelType"
        options={fuelTypeOptions}
        value={fuelTypeOptions.find(
          (option) => option.value === formData.fuelType
        )}
        onChange={(selectedOption) =>
          handleChange({
            target: { name: "fuelType", value: selectedOption.value },
          })
        }
        placeholder="Select octane rating"
        isClearable
        className="custom-select"
      />

      <label htmlFor="fuelPrice">Fuel Price (per liter)</label>
      <input
        type="number"
        name="fuelPrice"
        value={formData.fuelPrice}
        onChange={handleChange}
        placeholder="Fuel price per liter"
        min="0"
        step="0.01"
        className="custom-input"
      />

      <label htmlFor="passengers">Number of Passengers</label>
      <input
        type="number"
        name="passengers"
        value={formData.passengers}
        onChange={handleChange}
        placeholder="Enter number of passengers"
        min="1"
        className="custom-input"
      />

      <label htmlFor="totalWeight">Estimated Total Weight (kg)</label>
      <input
        type="number"
        name="totalWeight"
        value={formData.totalWeight}
        onChange={handleChange}
        placeholder="Passengers, luggage, cargo, etc."
        min="0"
        className="custom-input"
      />
    </form>
  );
};

TripForm.propTypes = {
  formData: PropTypes.object.isRequired,
  brandOptions: PropTypes.array.isRequired,
  modelOptions: PropTypes.array.isRequired,
  handleBrandSelect: PropTypes.func.isRequired,
  handleModelSelect: PropTypes.func.isRequired,
  handleChange: PropTypes.func.isRequired,
};

export default TripForm;
