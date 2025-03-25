import PropTypes from "prop-types";

const TripResults = ({ results }) => {
  if (!results) return null;

  return (
    <div className="results">
      <h2>Resultados del Viaje</h2>
      <p>Distancia: {results.distance} km</p>
      <p>Consumo de combustible: {results.fuelUsed} litros</p>
      <p>Costo total: ${results.totalCost}</p>
      <p>Condiciones climáticas: {results.weather}</p>
      <p>Pendiente del camino: {results.roadSlope}</p>
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
  }),
};

export default TripResults;
