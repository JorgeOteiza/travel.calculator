import PropTypes from "prop-types";

const TripResults = ({ results }) => {
  if (!results) return null;

  return (
    <div className="results">
      <h2>Resultados del Viaje</h2>
      <p>
        <strong>Distancia:</strong> {results.distance} km
      </p>
      <p>
        <strong>Consumo de combustible:</strong> {results.fuelUsed} litros
      </p>
      <p>
        <strong>Costo total:</strong> ${results.totalCost}
      </p>
      <p>
        <strong>Condiciones climáticas:</strong> {results.weather}
      </p>
      <p>
        <strong>Pendiente del camino:</strong> {results.roadSlope}
      </p>

      {results.vehicleDetails && (
        <>
          <h3>Detalles del Vehículo</h3>
          <p>
            <strong>Marca:</strong> {results.vehicleDetails.make}
          </p>
          <p>
            <strong>Modelo:</strong> {results.vehicleDetails.model}
          </p>
          <p>
            <strong>Año:</strong> {results.vehicleDetails.year}
          </p>
          <p>
            <strong>Tipo de Combustible:</strong>{" "}
            {results.vehicleDetails.fuel_type}
          </p>
          <p>
            <strong>Cilindrada:</strong> {results.vehicleDetails.engine_cc} cc
          </p>
          <p>
            <strong>N° de Cilindros:</strong>{" "}
            {results.vehicleDetails.engine_cylinders}
          </p>
          <p>
            <strong>Peso:</strong> {results.vehicleDetails.weight_kg} kg
          </p>
          <p>
            <strong>Consumo Mixto:</strong> {results.vehicleDetails.lkm_mixed}{" "}
            l/100km
          </p>
        </>
      )}
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
