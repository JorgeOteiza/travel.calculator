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
            <strong>Distancia:</strong> {formatValue(distance, "km")}
          </li>

          <li>
            <strong>Consumo base:</strong> {formatValue(baseFC, "L/100km")}
          </li>

          <li>
            <strong>Consumo ajustado:</strong>{" "}
            {formatValue(adjustedFC, "L/100km")}
          </li>

          <li>
            <strong>Consumo total:</strong> {formatValue(fuelUsed, "litros")}
          </li>

          <li>
            <strong>Costo total:</strong> {formatValue(totalCost, "$")}
          </li>

          <li>
            <strong>Condiciones climáticas:</strong> {weather || "-"}
          </li>

          <li>
            <strong>Pendiente promedio:</strong> {roadGrade || "-"}
          </li>

          <li>
            <strong>Segmentos analizados:</strong> {segmentsAnalyzed ?? "-"}
          </li>
        </ul>

        {/* 🧠 EXPLICACIÓN DEL MODELO */}
        <div className="trip-explanation">
          <h4>🧠 ¿Cómo se calculó este consumo?</h4>
          <ul>
            <li>Consumo base del vehículo</li>
            <li>Ajuste por carga y pasajeros</li>
            <li>Análisis por tramos de la ruta (polyline)</li>
            <li>Pendiente real por segmento (elevación)</li>
            <li>Condiciones climáticas</li>
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
              {formatValue(vehicle.engine_cc, "cc")}
            </li>

            <li>
              <strong>Peso:</strong> {formatValue(vehicle.weight_kg, "kg")}
            </li>

            <li>
              <strong>Consumo mixto:</strong>{" "}
              {formatValue(vehicle.lkm_mixed, "L/100km")}
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
