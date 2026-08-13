import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import ShareModal from "../components/ShareModal";
import { readStoredResult } from "../utils/resultStorage";
import { formatConsumption, formatDistance, formatLiters } from "../utils/numberFormat";
import { getDrivingStyleLabel, getRoadProfileLabel, getTrafficLabel, getWeatherLabel } from "../utils/tripLabels";
import "../styles/Result.css";

const Result = () => {
  const location = useLocation();
  const result = location.state?.result || readStoredResult();
  const [showShare, setShowShare] = useState(false);

  if (!result) return <div className="empty-result"><span>🧭</span><h1>No hay un resultado disponible</h1><p>Realiza un cálculo para generar el resumen.</p><Link to="/calculadora">Ir a la calculadora</Link></div>;

  const currency = result.settings?.currency || "CLP";
  const cost = new Intl.NumberFormat("es-CL", { style: "currency", currency, maximumFractionDigits: currency === "CLP" ? 0 : 2 }).format(result.totalCost || 0);
  const costPerKm = new Intl.NumberFormat("es-CL", { style: "currency", currency, maximumFractionDigits: currency === "CLP" ? 0 : 2 }).format(result.distance > 0 ? result.totalCost / result.distance : 0);
  const baseLabel = result.consumptionSource === "custom" && result.userConsumptionKml
    ? `${formatConsumption(result.userConsumptionKml)} km/L informados`
    : "Estándar del vehículo";
  const contextFactors = [
    `${result.vehicle?.make || "Vehículo"} ${result.vehicle?.model || ""}`.trim(),
    getRoadProfileLabel(result.roadProfile),
    getDrivingStyleLabel(result.drivingStyle),
    result.operatingConditions?.traffic_level && `Tráfico ${getTrafficLabel(result.operatingConditions.traffic_level)}`,
    result.operatingConditions?.is_short_trip && "Ajuste por trayecto corto",
    result.consumptionSource === "custom" && result.consumptionReferenceProfile
      && `Rendimiento medido en ${getRoadProfileLabel(result.consumptionReferenceProfile).toLowerCase()}`,
    result.weather && `Clima: ${getWeatherLabel(result.weather).toLowerCase()}`,
  ].filter(Boolean);

  return (
    <div className="result-page quick-result-page">
      <header className="result-header">
        <div className="result-heading-copy">
          <span className="result-kicker">Resultado rápido {result.isDemo && "· Demostración"}</span>
          <h1 title={`${result.originLabel} → ${result.destinationLabel}`}><span className="route-location">{result.originLabel || "Origen"}</span><i>→</i><span className="route-location">{result.destinationLabel || "Destino"}</span></h1>
          <p>Revisa el costo principal o abre el análisis para entender cada ajuste.</p>
        </div>
        <div className="result-actions">
          <button type="button" onClick={() => setShowShare(true)}>Compartir resumen</button>
          <Link to="/calculadora">Nuevo cálculo</Link>
        </div>
      </header>

      <section className="quick-result-card">
        <div className="quick-result-lead"><span>Costo estimado de combustible</span><strong>{cost}</strong><p>Consumo contextual de la ruta × precio por litro ingresado.</p></div>
        <div className="quick-metrics">
          <article><span>Distancia</span><strong>{formatDistance(result.distance)} km</strong></article>
          <article><span>Combustible</span><strong>{formatLiters(result.fuelUsed)} L</strong></article>
          <article><span>Consumo ajustado</span><strong>{formatConsumption(result.adjustedFC)} L/100 km</strong></article>
          <article><span>Clima</span><strong>{getWeatherLabel(result.weather)}</strong></article>
        </div>
        <div className="quick-result-cta"><div><strong>¿Quieres entender esta estimación?</strong><p>Revisa la elevación, el consumo por tramo y todos los ajustes aplicados.</p></div><Link to="/resultado/detalles" state={{ result }}>Ver análisis detallado</Link></div>
      </section>
      <section className="quick-context" aria-labelledby="quick-context-title">
        <div className="quick-context-heading"><span>Factores aplicados</span><h2 id="quick-context-title">Contexto de la estimación</h2></div>
        <article><span>Costo por kilómetro</span><strong>{costPerKm}/km</strong></article>
        <article><span>Rendimiento de partida</span><strong>{baseLabel}</strong></article>
        <div className="quick-factor-list">{contextFactors.map((factor) => <span key={factor}>{factor}</span>)}</div>
      </section>
      {showShare && <ShareModal result={result} onClose={() => setShowShare(false)} />}
    </div>
  );
};

export default Result;
