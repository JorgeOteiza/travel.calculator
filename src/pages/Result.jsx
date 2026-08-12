import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import ShareModal from "../components/ShareModal";
import { readStoredResult } from "../utils/resultStorage";
import { formatConsumption, formatDistance, formatLiters } from "../utils/numberFormat";
import "../styles/Result.css";

const Result = () => {
  const location = useLocation();
  const result = location.state?.result || readStoredResult();
  const [showShare, setShowShare] = useState(false);

  if (!result) return <div className="empty-result"><span>🧭</span><h1>No hay un resultado disponible</h1><p>Realiza un cálculo para generar el resumen.</p><Link to="/calculadora">Ir a la calculadora</Link></div>;

  const currency = result.settings?.currency || "CLP";
  const cost = new Intl.NumberFormat("es-CL", { style: "currency", currency, maximumFractionDigits: currency === "CLP" ? 0 : 2 }).format(result.totalCost || 0);

  return (
    <div className="result-page quick-result-page">
      <header className="result-header">
        <div className="result-heading-copy">
          <span className="result-kicker">Resultado rápido {result.isDemo && "· Demostración"}</span>
          <h1 title={`${result.originLabel} → ${result.destinationLabel}`}><span className="route-location">{result.originLabel || "Origen"}</span><i>→</i><span className="route-location">{result.destinationLabel || "Destino"}</span></h1>
          <p>Tu estimación principal está lista. Puedes revisar el modelo completo cuando quieras.</p>
        </div>
        <div className="result-actions">
          <button type="button" onClick={() => setShowShare(true)}>Compartir resumen</button>
          <Link to="/calculadora">Nuevo cálculo</Link>
        </div>
      </header>

      <section className="quick-result-card">
        <div className="quick-result-lead"><span>Costo estimado</span><strong>{cost}</strong><p>Basado en el precio de combustible ingresado.</p></div>
        <div className="quick-metrics">
          <article><span>Distancia</span><strong>{formatDistance(result.distance)} km</strong></article>
          <article><span>Combustible</span><strong>{formatLiters(result.fuelUsed)} L</strong></article>
          <article><span>Consumo ajustado</span><strong>{formatConsumption(result.adjustedFC)} L/100 km</strong></article>
          <article><span>Condición</span><strong>{result.weather || "Sin datos"}</strong></article>
        </div>
        <div className="quick-result-cta"><div><strong>¿Quieres entender esta estimación?</strong><p>Consulta elevación, consumo por tramo, vehículo y factores aplicados.</p></div><Link to="/resultado/detalles" state={{ result }}>Ver más detalles</Link></div>
      </section>
      {showShare && <ShareModal result={result} onClose={() => setShowShare(false)} />}
    </div>
  );
};

export default Result;
