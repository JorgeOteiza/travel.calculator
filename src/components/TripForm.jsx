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
  onToggleCustomVehicle,
}) => {
  const fuelTypeOptions = [
    { label: "Gasoline 93", value: "gasoline_93" },
    { label: "Gasoline 95", value: "gasoline_95" },
    { label: "Gasoline 97", value: "gasoline_97" },
  ];

  const isElectric = vehicleDetails?.fuel_type
    ?.toLowerCase()
    .includes("electric");

  const currentYear = new Date().getFullYear();
  // Octanaje solo aplica a gasolina: en modo personalizado con diésel no
  // corresponde mostrarlo ni exigirlo (ver fuel-fields-row más abajo).
  const showOctane = !isElectric
    && !(formData.isCustomVehicle && formData.customFuelType === "diesel");

  return (
    <form
      className="trip-form"
      onSubmit={(e) => e.preventDefault()}
      autoComplete="off"
    >
      <div className="trip-form-header">
        <span className="trip-form-eyebrow">Planifica tu ruta</span>
        <h1>Calcula tu viaje</h1>
        <p>Combina tu vehículo, rendimiento y condiciones de conducción.</p>
      </div>

      {isLoadingBrands && (
        <div className="form-skeleton" aria-label="Cargando catálogo de vehículos">
          <span /><span /><span />
        </div>
      )}

      <div className="vehicle-mode-toggle">
        <button type="button" className="link-button" onClick={onToggleCustomVehicle}>
          {formData.isCustomVehicle ? "Elegir un vehículo del catálogo" : "No encuentro mi vehículo"}
        </button>
      </div>

      {formData.isCustomVehicle ? (
        <div className="custom-vehicle-fields">
          <p className="custom-vehicle-help">
            Ingresa los datos de tu vehículo. El cálculo usará el rendimiento que nos
            indiques a continuación — es una estimación, no un dato homologado.
          </p>

          <div className="custom-vehicle-row">
            <div className="compact-form-field">
              <label htmlFor="customBrand">Marca</label>
              <input id="customBrand" type="text" name="customBrand" value={formData.customBrand ?? ""} onChange={handleChange} placeholder="Ej. Suzuki" maxLength={80} className="custom-input" required />
              {errors.customBrand && <span className="error-text">{errors.customBrand}</span>}
            </div>
            <div className="compact-form-field">
              <label htmlFor="customModel">Modelo</label>
              <input id="customModel" type="text" name="customModel" value={formData.customModel ?? ""} onChange={handleChange} placeholder="Ej. Mastervan" maxLength={80} className="custom-input" required />
              {errors.customModel && <span className="error-text">{errors.customModel}</span>}
            </div>
          </div>

          <div className="custom-vehicle-row">
            <div className="compact-form-field">
              <label htmlFor="customYear">Año</label>
              <input id="customYear" type="number" name="customYear" value={formData.customYear ?? ""} onChange={handleChange} placeholder="Ej. 2000" min="1900" max={currentYear + 1} className="custom-input" required />
              {errors.customYear && <span className="error-text">{errors.customYear}</span>}
            </div>
            <div className="compact-form-field">
              <label htmlFor="customFuelType">Tipo de combustible</label>
              <select id="customFuelType" name="customFuelType" value={formData.customFuelType ?? ""} onChange={handleChange} className="custom-input" required>
                <option value="">Selecciona</option>
                <option value="gasoline">Gasolina</option>
                <option value="diesel">Diésel</option>
              </select>
              {errors.customFuelType && <span className="error-text">{errors.customFuelType}</span>}
            </div>
          </div>

          <div className="custom-consumption-row">
            <div className="compact-form-field">
              <label htmlFor="customConsumptionValue">Rendimiento conocido</label>
              <div className="custom-consumption-value">
                <input id="customConsumptionValue" type="number" name="customConsumptionValue" value={formData.customConsumptionValue ?? ""} onChange={handleChange} placeholder="Ej. 8.5" min="0.1" step="0.1" className="custom-input" required />
                <select name="customConsumptionUnit" value={formData.customConsumptionUnit} onChange={handleChange} aria-label="Unidad del rendimiento" className="custom-input">
                  <option value="kml">km/L</option>
                  <option value="l100km">L/100km</option>
                </select>
              </div>
              {errors.customConsumptionValue && <span className="error-text">{errors.customConsumptionValue}</span>}
            </div>
            <div className="compact-form-field">
              <label htmlFor="customConsumptionReferenceProfile">¿Dónde lo mediste?</label>
              <select id="customConsumptionReferenceProfile" name="customConsumptionReferenceProfile" value={formData.customConsumptionReferenceProfile} onChange={handleChange} className="custom-input">
                <option value="city">Ciudad</option>
                <option value="mixed">Uso mixto</option>
                <option value="highway">Carretera</option>
                <option value="rural">Camino rural</option>
              </select>
              {errors.customConsumptionReferenceProfile && <span className="error-text">{errors.customConsumptionReferenceProfile}</span>}
            </div>
          </div>
          <small className="performance-help">
            Necesitamos este dato para calcular: no podemos estimar el consumo de un
            vehículo que no está en nuestro catálogo sin el rendimiento que nos indiques.
          </small>
        </div>
      ) : (
        <>
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
        </>
      )}

      <label htmlFor="roadProfile">Tipo de vía predominante</label>
      <select
        id="roadProfile"
        name="roadProfile"
        value={formData.roadProfile}
        onChange={handleChange}
        className="custom-input"
      >
        <option value="city">Ciudad / tráfico urbano</option>
        <option value="mixed">Mixto</option>
        <option value="highway">Autopista / carretera</option>
        <option value="rural">Camino rural / caletera</option>
      </select>

      <fieldset className="driving-style-choice">
        <legend>Ritmo de conducción</legend>
        <label><input type="radio" name="drivingStyle" value="calm" checked={formData.drivingStyle === "calm"} onChange={handleChange} /><span><strong>Tranquilo</strong><small>Sin apuros</small></span></label>
        <label><input type="radio" name="drivingStyle" value="moderate" checked={formData.drivingStyle === "moderate"} onChange={handleChange} /><span><strong>Moderado</strong><small>Ritmo normal</small></span></label>
        <label><input type="radio" name="drivingStyle" value="hurried" checked={formData.drivingStyle === "hurried"} onChange={handleChange} /><span><strong>Apurado</strong><small>Más aceleraciones</small></span></label>
      </fieldset>
      {errors.drivingStyle && <span className="error-text">{errors.drivingStyle}</span>}

      {!formData.isCustomVehicle && (
        <>
          <fieldset className="consumption-choice">
            <legend>Base de rendimiento del vehículo</legend>
            <label>
              <input type="radio" name="consumptionMode" value="standard" checked={formData.consumptionMode === "standard"} onChange={handleChange} />
              <span><strong>Usar dato estándar</strong><small>Usaremos el rendimiento disponible para este modelo.</small></span>
            </label>
            <label>
              <input type="radio" name="consumptionMode" value="custom" checked={formData.consumptionMode === "custom"} onChange={handleChange} />
              <span><strong>Ingresar rendimiento real</strong><small>Si conoces cuántos kilómetros recorre por litro.</small></span>
            </label>
          </fieldset>
          {formData.consumptionMode === "custom" && <>
            <div className="custom-consumption-row">
              <div className="compact-form-field">
                <label htmlFor="userConsumptionKml">Rendimiento actual</label>
                <div className="performance-input"><input id="userConsumptionKml" type="number" name="userConsumptionKml" value={formData.userConsumptionKml ?? ""} onChange={handleChange} placeholder="Ej. 9,4" min="2" max="40" step="0.1" className="custom-input" /><span>km/L</span></div>
                {errors.userConsumptionKml && <span className="error-text">{errors.userConsumptionKml}</span>}
              </div>
              <div className="compact-form-field">
                <label htmlFor="consumptionReferenceProfile">¿Dónde lo mediste?</label>
                <select id="consumptionReferenceProfile" name="consumptionReferenceProfile" value={formData.consumptionReferenceProfile} onChange={handleChange} className="custom-input"><option value="city">Ciudad</option><option value="mixed">Uso mixto</option><option value="highway">Carretera</option><option value="rural">Camino rural</option></select>
                {errors.consumptionReferenceProfile && <span className="error-text">{errors.consumptionReferenceProfile}</span>}
              </div>
            </div>
            <small className="performance-help">Adaptaremos ese rendimiento al tipo de vía y a las condiciones de la ruta calculada.</small>
          </>}
        </>
      )}

      {!isElectric && (
        <div className="fuel-fields-row">
          {showOctane && (
          <div className="fuel-field">
            <label htmlFor="fuelType">Octanaje</label>
            <Select
              id="fuelType"
              name="fuelType"
              options={fuelTypeOptions}
              value={fuelTypeOptions.find((opt) => opt.value === formData.fuelType) || null}
              onChange={(selectedOption) => handleChange({ target: { name: "fuelType", value: selectedOption?.value || "" } })}
              placeholder="Selecciona"
              isClearable
              className="custom-select"
              classNamePrefix="custom-select"
            />
            {errors.fuelType && <span className="error-text">{errors.fuelType}</span>}
          </div>
          )}
          <div className="fuel-field">
            <label htmlFor="fuelPrice">Precio por litro</label>
            <div className="currency-input">
              <span aria-hidden="true">$</span>
              <input id="fuelPrice" type="number" name="fuelPrice" value={formData.fuelPrice ?? ""} onChange={handleChange} placeholder="Ej. 1.250" min="0" step="1" className="custom-input" aria-label="Precio del combustible en pesos chilenos por litro" required />
            </div>
            {errors.fuelPrice && <span className="error-text">{errors.fuelPrice}</span>}
          </div>
        </div>
      )}

      <div className="passenger-weight-row">
        <div className="compact-form-field"><label htmlFor="passengers">Número de pasajeros</label><input id="passengers" type="number" name="passengers" value={formData.passengers ?? ""} onChange={handleChange} placeholder="Ej. 2" min="1" className="custom-input" required />{errors.passengers && <span className="error-text">{errors.passengers}</span>}</div>
        <div className="compact-form-field"><label htmlFor="extraWeight">Peso adicional (kg)</label><input id="extraWeight" type="number" name="extraWeight" value={formData.extraWeight ?? ""} onChange={handleChange} placeholder="Ej. 20" min="0" className="custom-input" required />{errors.extraWeight && <span className="error-text">{errors.extraWeight}</span>}</div>
      </div>

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
  onToggleCustomVehicle: PropTypes.func.isRequired,
};

export default TripForm;
