import PropTypes from "prop-types";
import "../styles/TripResults.css";
import { formatCLP } from "../utils/currency";
import { formatConsumption, formatDistance, formatLiters, formatNumber, formatPercentage, formatWeight } from "../utils/numberFormat";
import { getWeatherLabel } from "../utils/tripLabels";

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
    segmentsAnalyzed,
    vehicle = {},
  } = results;

  const gradeValue = parseFloat(roadGrade);

  const isMountainRoute =
    !Number.isNaN(gradeValue) && Math.abs(gradeValue) < 2 && distance < 60;

  return (
    <div className="trip-results-container">
      <div className="trip-results-card">
        <h2>📊 Resultados del Viaje</h2>

        <ul>
          <li>
            <strong>Distancia:</strong> {formatDistance(distance)} km
          </li>

          <li>
            <strong>Consumo base:</strong> {formatConsumption(baseFC)} L/100 km
          </li>

          <li>
            <strong>Consumo ajustado:</strong>{" "}
            {formatConsumption(adjustedFC)} L/100 km
          </li>

          <li>
            <strong>Consumo total:</strong> {formatLiters(fuelUsed)} litros
          </li>

          <li>
            <strong>Costo total:</strong> {formatCLP(totalCost)}
          </li>

          <li>
            <strong>Clima:</strong> {getWeatherLabel(weather)}
          </li>

          <li>
            <strong>Pendiente promedio:</strong> {formatPercentage(roadGrade)}%
          </li>

          <li>
            <strong>Segmentos analizados:</strong> {segmentsAnalyzed ?? "-"}
          </li>
        </ul>

        {/* 🧠 EXPLICACIÓN DEL MODELO */}
        <div className="trip-explanation">
          <h4>🧠 ¿Qué considera esta estimación?</h4>
          <ul>
            <li>Rendimiento estándar o informado por el usuario</li>
            <li>Tipo de vía y ritmo de conducción</li>
            <li>Carga, pasajeros y condiciones de operación</li>
            <li>Consumo y pendiente por cada tramo de la ruta</li>
            <li>Clima y tráfico estimado según horario</li>
          </ul>
        </div>

        {/* 🏔️ INFO AVANZADA */}
        {segmentsAnalyzed && (
          <div className="trip-info">
            🔍 Este cálculo utiliza{" "}
            <strong>{segmentsAnalyzed} segmentos reales</strong> de la ruta,
            considerando pendientes específicas en cada tramo.
          </div>
        )}

        {/* ℹ️ CONTEXTO DE CERROS */}
        {isMountainRoute && (
          <div className="trip-info">
            ℹ️ En rutas de cerros, el consumo instantáneo puede ser alto en
            subidas (15–20 L/100km), pero el valor mostrado corresponde al
            <strong> promedio total del viaje</strong>.
          </div>
        )}

        {/* 🚘 VEHÍCULO */}
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
              <strong>Combustible:</strong> {vehicle.fuel_type || "-"}
            </li>

            <li>
              <strong>Cilindrada:</strong>{" "}
              {formatNumber(vehicle.engine_cc, { maximumFractionDigits: 0 })} cc
            </li>

            <li>
              <strong>Peso:</strong> {formatWeight(vehicle.weight_kg)} kg
            </li>

            <li>
              <strong>Consumo mixto:</strong>{" "}
              {formatConsumption(vehicle.lkm_mixed)} L/100 km
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

TripResults.propTypes = {
  results: PropTypes.object,
};

export default TripResults;
