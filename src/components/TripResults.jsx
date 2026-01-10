import PropTypes from "prop-types";
import "../styles/TripResults.css";

const formatValue = (value, unit = "") =>
  value !== undefined && value !== null ? `${value} ${unit}`.trim() : "-";

const TripResults = ({ results }) => {
  if (!results) return null;

  const {
    distance,
    fuelUsed,
    totalCost,
    weather,
    roadGrade,
    baseFC,
    adjustedFC,
    vehicle = {},
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
            <strong>Consumo base del vehículo:</strong>{" "}
            {formatValue(baseFC, "L/100km")}
          </li>

          <li>
            <strong>Consumo ajustado:</strong>{" "}
            {formatValue(adjustedFC, "L/100km")}
          </li>

          <li>
            <strong>Consumo total:</strong>{" "}
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
            <strong>Pendiente del camino:</strong> {roadGrade || "-"}
          </li>
        </ul>

        {isSnowy && (
          <div className="trip-warning-snowy">
            ⚠️ <strong>Advertencia:</strong> Se detectaron condiciones de nieve.
            El consumo puede aumentar por menor tracción y mayor resistencia.
          </div>
        )}

        {vehicle && (
          <div className="vehicle-details">
            <h3>🚘 Detalles del Vehículo</h3>

            <ul>
              <li>
                <strong>Marca:</strong> {vehicle.make || "-"}
              </li>

              <li>
                <strong>Modelo:</strong> {vehicle.model || "-"}
              </li>

              <li>
                <strong>Año:</strong> {vehicle.year || "-"}
              </li>

              <li>
                <strong>Tipo de Combustible:</strong> {vehicle.fuel_type || "-"}
              </li>

              <li>
                <strong>Cilindrada:</strong>{" "}
                {formatValue(vehicle.engine_cc, "cc")}
              </li>

              <li>
                <strong>N° de Cilindros:</strong> {vehicle.cylinders || "-"}
              </li>

              <li>
                <strong>Peso:</strong> {formatValue(vehicle.weight_kg, "kg")}
              </li>

              <li>
                <strong>Consumo Mixto:</strong>{" "}
                {formatValue(vehicle.lkm_mixed, "L/100km")}
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
    roadGrade: PropTypes.string,
    baseFC: PropTypes.number,
    adjustedFC: PropTypes.number,
    vehicle: PropTypes.shape({
      make: PropTypes.string,
      model: PropTypes.string,
      year: PropTypes.number,
      fuel_type: PropTypes.string,
      engine_cc: PropTypes.number,
      cylinders: PropTypes.number,
      weight_kg: PropTypes.number,
      lkm_mixed: PropTypes.number,
    }),
  }),
};

export default TripResults;
