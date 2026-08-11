import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import LineChart from "../components/LineChart";
import ShareModal from "../components/ShareModal";
import { readStoredResult } from "../utils/resultStorage";
import "../styles/Result.css";

const ResultDetails = () => {
  const location = useLocation();
  const result = location.state?.result || readStoredResult();
  const [currency, setCurrency] = useState(result?.settings?.currency || "CLP");
  const [distanceUnit, setDistanceUnit] = useState(result?.settings?.distanceUnit || "km");
  const [showShare, setShowShare] = useState(false);
  const distance = useMemo(() => !result ? 0 : distanceUnit === "mi" ? result.distance * 0.621371 : result.distance, [distanceUnit, result]);

  if (!result) return <div className="empty-result"><h1>No hay detalles disponibles</h1><Link to="/calculadora">Ir a la calculadora</Link></div>;
  const cost = new Intl.NumberFormat("es-CL", { style: "currency", currency, maximumFractionDigits: currency === "CLP" ? 0 : 2 }).format(result.totalCost || 0);

  return <div className="result-page">
    <Link className="back-to-summary" to="/resultado" state={{ result }}>← Volver al resumen</Link>
    <header className="result-header"><div className="result-heading-copy"><span className="result-kicker">Análisis detallado</span><h1 title={`${result.originLabel} → ${result.destinationLabel}`}><span className="route-location">{result.originLabel || "Origen"}</span><i>→</i><span className="route-location">{result.destinationLabel || "Destino"}</span></h1><p>Desglose del consumo y los factores aplicados.</p></div><div className="result-actions"><button type="button" onClick={() => setShowShare(true)}>Compartir resumen</button><Link to="/calculadora">Nuevo cálculo</Link></div></header>
    <section className="result-settings"><label>Moneda<select value={currency} onChange={(e) => setCurrency(e.target.value)}><option>CLP</option><option>USD</option><option>EUR</option></select></label><label>Distancia<select value={distanceUnit} onChange={(e) => setDistanceUnit(e.target.value)}><option value="km">Kilómetros</option><option value="mi">Millas</option></select></label><p>El selector cambia el formato, no convierte el tipo de cambio.</p></section>
    <section className="metric-grid"><article><span>Distancia</span><strong>{distance.toFixed(1)} {distanceUnit}</strong><small>Ruta calculada</small></article><article><span>Combustible</span><strong>{result.fuelUsed} L</strong><small>{result.adjustedFC} L/100 km</small></article><article className="metric-highlight"><span>Costo estimado</span><strong>{cost}</strong><small>Precio ingresado</small></article><article><span>Clima</span><strong>{result.weather}</strong><small>Pendiente media {result.roadGrade}%</small></article></section>
    <section className="chart-grid"><LineChart data={result.elevationProfile} valueKey="elevation" label="Perfil de elevación" unit="m" /><LineChart data={result.consumptionProfile} valueKey="consumption_l100km" label="Consumo por segmento" unit="L/100 km" color="#ef8a3c" /></section>
    <section className="result-detail-grid"><article><h2>Vehículo</h2><dl><div><dt>Marca y modelo</dt><dd>{result.vehicle?.make || "-"} {result.vehicle?.model || ""}</dd></div><div><dt>Año</dt><dd>{result.vehicle?.year || "-"}</dd></div><div><dt>Motor</dt><dd>{result.vehicle?.engine_cc ? `${result.vehicle.engine_cc} cc` : "-"}</dd></div><div><dt>Consumo base</dt><dd>{result.baseFC ?? "-"} L/100 km</dd></div></dl></article><article><h2>Cómo se calculó</h2><ol><li>Consumo base del vehículo.</li><li>Tipo de vía: {result.roadProfile || "mixed"}.</li><li>Pasajeros y carga adicional.</li><li>{result.segmentsAnalyzed || 0} segmentos de ruta.</li><li>Elevación {result.elevationSource === "flat_fallback" ? "con fallback plano" : "Open-Meteo / Copernicus DEM"}.</li><li>Condiciones climáticas.</li></ol>{result.elevationSource === "open_meteo" && <p className="data-attribution">Elevación: Open-Meteo, Copernicus DEM GLO-90.</p>}</article></section>
    {showShare && <ShareModal result={result} onClose={() => setShowShare(false)} />}
  </div>;
};

export default ResultDetails;
