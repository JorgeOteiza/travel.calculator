import PropTypes from "prop-types";

const TripResults = ({ results }) => {
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

TripResults.propTypes = {
  results: PropTypes.shape({
    distance: PropTypes.number,
    fuelConsumed: PropTypes.number,
    totalCost: PropTypes.number,
    weather: PropTypes.string,
  }),
};

export default TripResults;
