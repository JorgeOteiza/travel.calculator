import PropTypes from "prop-types";
import "../styles/tripResults.css";

const TripResults = ({ results }) => {
  if (!results) return null;

  return (
    <div className="trip-results-container">
      <div className="trip-results-card">
        <h2>Resultados del Viaje</h2>
        <ul>
          <li>
            <strong>Distancia:</strong> {results.distance} km
          </li>
          <li>
            <strong>Consumo de combustible:</strong>{" "}
            {results.fuelUsed?.toFixed(3)} litros
          </li>
          <li>
            <strong>Costo total:</strong> ${results.totalCost?.toFixed(3)}
          </li>
          <li>
            <strong>Condiciones climáticas:</strong> {results.weather}
          </li>
          <li>
            <strong>Pendiente del camino:</strong> {results.roadSlope}
          </li>
        </ul>

        {results.vehicleDetails && (
          <div className="vehicle-details">
            <h3>Detalles del Vehículo</h3>
            <ul>
              <li>
                <strong>Marca:</strong> {results.vehicleDetails.make}
              </li>
              <li>
                <strong>Modelo:</strong> {results.vehicleDetails.model}
              </li>
              <li>
                <strong>Año:</strong> {results.vehicleDetails.year}
              </li>
              <li>
                <strong>Tipo de Combustible:</strong>{" "}
                {results.vehicleDetails.fuel_type}
              </li>
              <li>
                <strong>Cilindrada:</strong> {results.vehicleDetails.engine_cc}{" "}
                cc
              </li>
              <li>
                <strong>N° de Cilindros:</strong>{" "}
                {results.vehicleDetails.engine_cylinders}
              </li>
              <li>
                <strong>Peso:</strong> {results.vehicleDetails.weight_kg} kg
              </li>
              <li>
                <strong>Consumo Mixto:</strong>{" "}
                {results.vehicleDetails.lkm_mixed} l/100km
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
