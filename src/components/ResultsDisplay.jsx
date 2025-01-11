import PropTypes from "prop-types";

const ResultsDisplay = ({ results }) => {
  if (!results) return null;

  return (
    <div className="results">
      <h2>Results</h2>
      <p>Distance: {results.distance} km</p>
      <p>Fuel Consumed: {results.fuelConsumed} liters</p>
      <p>Total Cost: ${results.totalCost}</p>
      <p>Weather: {results.weather}</p>
    </div>
  );
};

// ✅ Validación de props
ResultsDisplay.propTypes = {
  results: PropTypes.shape({
    distance: PropTypes.number,
    fuelConsumed: PropTypes.number,
    totalCost: PropTypes.number,
    weather: PropTypes.string,
  }),
};

export default ResultsDisplay;
