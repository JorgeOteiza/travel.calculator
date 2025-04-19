import PropTypes from "prop-types";
import "../styles/tripResults.css";

const formatValue = (value, unit = "") =>
  value !== undefined && value !== null ? `${value} ${unit}`.trim() : "-";

const TripResults = ({ results }) => {
  if (!results) return null;

  const {
    distance,
    fuelUsed,
    totalCost,
    weather,
    roadSlope,
    vehicleDetails = {},
  } = results;

  const isSnowy = weather?.toLowerCase() === "snowy";

  return (
    <div className="trip-results-container">
      <div className="trip-results-card">
        <h2>📊 Resultados del Viaje</h2>
        <ul>
          <li>
            <strong>Distancia:</strong> {formatValue(distance, "km")}
          </li>
          <li>
            <strong>Consumo de combustible:</strong>{" "}
            {formatValue(fuelUsed?.toFixed(2), "litros")}
          </li>
          <li>
            <strong>Costo total:</strong>{" "}
            {formatValue(totalCost?.toFixed(2), "$")}
          </li>
          <li>
            <strong>Condiciones climáticas:</strong> {weather || "-"}
          </li>
          <li>
            <strong>Pendiente del camino:</strong> {roadSlope || "-"}
          </li>
        </ul>

        {isSnowy && (
          <div className="trip-warning-snowy">
            ⚠️ <strong>Advertencia:</strong> Se detectaron condiciones de nieve.
            El consumo de combustible puede incrementarse considerablemente
            debido al aumento en la resistencia y menor tracción.
          </div>
        )}

        {vehicleDetails && (
          <div className="vehicle-details">
            <h3>🚘 Detalles del Vehículo</h3>
            <ul>
              <li>
                <strong>Marca:</strong> {vehicleDetails.make || "-"}
              </li>
              <li>
                <strong>Modelo:</strong> {vehicleDetails.model || "-"}
              </li>
              <li>
                <strong>Año:</strong> {vehicleDetails.year || "-"}
              </li>
              <li>
                <strong>Tipo de Combustible:</strong>{" "}
                {vehicleDetails.fuel_type || "-"}
              </li>
              <li>
                <strong>Cilindrada:</strong>{" "}
                {formatValue(vehicleDetails.engine_cc, "cc")}
              </li>
              <li>
                <strong>N° de Cilindros:</strong>{" "}
                {vehicleDetails.engine_cylinders || "-"}
              </li>
              <li>
                <strong>Peso:</strong>{" "}
                {formatValue(vehicleDetails.weight_kg, "kg")}
              </li>
              <li>
                <strong>Consumo Mixto:</strong>{" "}
                {formatValue(vehicleDetails.lkm_mixed, "l/100km")}
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

TripResults.propTypes = {
  results: PropTypes.shape({
    distance: PropTypes.number,
    fuelUsed: PropTypes.number,
    totalCost: PropTypes.number,
    weather: PropTypes.string,
    roadSlope: PropTypes.string,
    vehicleDetails: PropTypes.shape({
      make: PropTypes.string,
      model: PropTypes.string,
      year: PropTypes.number,
      fuel_type: PropTypes.string,
      engine_cc: PropTypes.number,
      engine_cylinders: PropTypes.number,
      weight_kg: PropTypes.number,
      lkm_mixed: PropTypes.number,
    }),
  }),
};

export default TripResults;
