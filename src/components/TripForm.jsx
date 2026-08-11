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
  isCalculating,
  isLoadingBrands,
  isLoadingModels,
  message,
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
      <div className="trip-form-header">
        <span className="trip-form-eyebrow">Planifica tu ruta</span>
        <h1>Calcula tu viaje</h1>
        <p>Completa los datos para estimar consumo y costo.</p>
      </div>

      {isLoadingBrands && (
        <div className="form-skeleton" aria-label="Cargando catálogo de vehículos">
          <span /><span /><span />
        </div>
      )}

      {/* Marca */}
      <label htmlFor="brand">Marca del vehículo</label>
      <Select
        id="brand"
        name="brand"
        options={brandOptions}
        value={brandOptions.find((opt) => opt.value === formData.brand) || null}
        onChange={handleBrandSelect}
        placeholder="Selecciona una marca"
        isClearable
        className="custom-select"
        classNamePrefix="custom-select"
        isLoading={isLoadingBrands}
      />
      {errors.brand && <span className="error-text">{errors.brand}</span>}

      {/* Modelo */}
      <label htmlFor="model">Modelo</label>
      <Select
        id="model"
        name="model"
        options={modelOptions}
        value={modelOptions.find((opt) => opt.value === formData.model) || null}
        onChange={handleModelSelect}
        placeholder="Selecciona un modelo"
        isClearable
        className="custom-select"
        classNamePrefix="custom-select"
        isDisabled={!formData.brand}
        isLoading={isLoadingModels}
      />
      {errors.model && <span className="error-text">{errors.model}</span>}

      {/* Año */}
      <label htmlFor="year">Año</label>
      <select
        id="year"
        name="year"
        value={formData.year || ""}
        onChange={(e) => handleYearSelect(e.target.value)}
        className="custom-input"
        disabled={!availableYears.length}
        required
      >
        <option value="">Selecciona un año</option>
        {availableYears.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
      {errors.year && <span className="error-text">{errors.year}</span>}

      {/* Tipo de combustible */}
      {!isElectric && (
        <>
          <label htmlFor="fuelType">Octanaje</label>
          <Select
            id="fuelType"
            name="fuelType"
            options={fuelTypeOptions}
            value={
              fuelTypeOptions.find((opt) => opt.value === formData.fuelType) ||
              null
            }
            onChange={(selectedOption) =>
              handleChange({
                target: {
                  name: "fuelType",
                  value: selectedOption?.value || "",
                },
              })
            }
            placeholder="Selecciona el octanaje"
            isClearable
            className="custom-select"
            classNamePrefix="custom-select"
          />
          {errors.fuelType && (
            <span className="error-text">{errors.fuelType}</span>
          )}
        </>
      )}

      {/* Precio del combustible */}
      {!isElectric && (
        <>
          <label htmlFor="fuelPrice">Precio por litro</label>
          <input
            type="number"
            name="fuelPrice"
            value={formData.fuelPrice ?? ""}
            onChange={handleChange}
            placeholder="Ej. 1.250"
            min="0"
            step="0.01"
            className="custom-input"
            required
          />
        </>
      )}

      {/* Pasajeros */}
      <label htmlFor="passengers">Número de pasajeros</label>
      <input
        type="number"
        name="passengers"
        value={formData.passengers ?? ""}
        onChange={handleChange}
        placeholder="Ej. 2"
        min="1"
        className="custom-input"
        required
      />
      {errors.passengers && (
        <span className="error-text">{errors.passengers}</span>
      )}

      {/* Peso extra */}
      <label htmlFor="extraWeight">Peso adicional estimado (kg)</label>
      <input
        type="number"
        name="extraWeight"
        value={formData.extraWeight ?? ""}
        onChange={handleChange}
        placeholder="Equipaje, carga, etc."
        min="0"
        className="custom-input"
        required
      />
      {errors.extraWeight && (
        <span className="error-text">{errors.extraWeight}</span>
      )}

      <div className="trip-preferences">
        <label htmlFor="currency">Moneda
          <select id="currency" name="currency" value={formData.currency} onChange={handleChange}>
            <option value="CLP">CLP ($)</option>
            <option value="USD">USD (US$)</option>
            <option value="EUR">EUR (€)</option>
          </select>
        </label>
        <label htmlFor="distanceUnit">Unidad
          <select id="distanceUnit" name="distanceUnit" value={formData.distanceUnit} onChange={handleChange}>
            <option value="km">Kilómetros</option>
            <option value="mi">Millas</option>
          </select>
        </label>
      </div>

      {message && <div className="form-notification" role="alert">{message}</div>}

      <button
        type="button"
        className="calculate-button"
        onClick={calculateTrip}
        disabled={isCalculating}
      >
        {isCalculating ? <><span className="button-spinner" /> Calculando ruta…</> : "Calcular viaje"}
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
  isCalculating: PropTypes.bool.isRequired,
  isLoadingBrands: PropTypes.bool.isRequired,
  isLoadingModels: PropTypes.bool.isRequired,
  message: PropTypes.string,
};

export default TripForm;
