import PropTypes from "prop-types";
import Select from "react-select";
import "../styles/TripForm.css";

const TripForm = ({
  formData,
  brandOptions,
  modelOptions,
  availableYears,
  vehicleDetails,
  handleBrandSelect,
  handleModelSelect,
  handleYearSelect,
  handleChange,
  calculateTrip,
  errors,
}) => {
  const fuelTypeOptions = [
    { label: "Gasoline 93", value: "gasoline_93" },
    { label: "Gasoline 95", value: "gasoline_95" },
    { label: "Gasoline 97", value: "gasoline_97" },
  ];

  const isElectric = vehicleDetails?.fuel_type
    ?.toLowerCase()
    .includes("electric");

  return (
    <form
      className="trip-form"
      onSubmit={(e) => e.preventDefault()}
      autoComplete="off"
    >
      {/* Marca */}
      <label htmlFor="brand">Vehicle Brand</label>
      <Select
        id="brand"
        name="brand"
        options={brandOptions}
        value={brandOptions.find((opt) => opt.value === formData.brand) || null}
        onChange={(selected) => handleBrandSelect(selected?.value || "")}
        placeholder="Select a brand"
        isClearable
        className="custom-select"
      />
      {errors.brand && <span className="error-text">{errors.brand}</span>}

      {/* Modelo */}
      <label htmlFor="model">Vehicle Model</label>
      <Select
        id="model"
        name="model"
        options={modelOptions}
        value={modelOptions.find((opt) => opt.value === formData.model) || null}
        onChange={(selected) => handleModelSelect(selected?.value || "")}
        placeholder="Select a model"
        isClearable
        className="custom-select"
        isDisabled={!formData.brand}
      />
      {errors.model && <span className="error-text">{errors.model}</span>}

      {/* Año */}
      <label htmlFor="year">Vehicle Year</label>
      <select
        id="year"
        name="year"
        value={formData.year}
        onChange={(e) => handleYearSelect(e.target.value)}
        className="custom-input"
        disabled={!availableYears.length}
      >
        <option value="">Select year</option>
        {availableYears.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
      {errors.year && <span className="error-text">{errors.year}</span>}

      {/* Tipo de combustible (solo si no es eléctrico) */}
      {!isElectric && (
        <>
          <label htmlFor="fuelType">Octane Rating</label>
          <Select
            id="fuelType"
            name="fuelType"
            options={fuelTypeOptions}
            value={fuelTypeOptions.find(
              (opt) => opt.value === formData.fuelType
            )}
            onChange={(selectedOption) =>
              handleChange({
                target: {
                  name: "fuelType",
                  value: selectedOption?.value || "",
                },
              })
            }
            placeholder="Select octane rating"
            isClearable
            className="custom-select"
          />
          {errors.fuelType && (
            <span className="error-text">{errors.fuelType}</span>
          )}
        </>
      )}

      {/* Precio del combustible (solo si no es eléctrico) */}
      {!isElectric && (
        <>
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
        </>
      )}

      {/* Pasajeros */}
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
      {errors.passengers && (
        <span className="error-text">{errors.passengers}</span>
      )}

      {/* Peso total */}
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
      {errors.totalWeight && (
        <span className="error-text">{errors.totalWeight}</span>
      )}

      {/* Botón de cálculo */}
      <button
        type="button"
        className="calculate-button"
        onClick={calculateTrip}
      >
        Calculate Trip
      </button>
    </form>
  );
};

TripForm.propTypes = {
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
};

export default TripForm;
