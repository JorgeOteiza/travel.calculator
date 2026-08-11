import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import LineChart from "../components/LineChart";
import "../styles/Result.css";

const readStoredResult = () => {
  try {
    return JSON.parse(sessionStorage.getItem("travelCalculator:lastResult"));
  } catch {
    return null;
  }
};

const Result = () => {
  const location = useLocation();
  const result = location.state?.result || readStoredResult();
  const [currency, setCurrency] = useState(result?.settings?.currency || "CLP");
  const [distanceUnit, setDistanceUnit] = useState(result?.settings?.distanceUnit || "km");
  const [notice, setNotice] = useState("");

  const distance = useMemo(() => {
    if (!result) return 0;
    return distanceUnit === "mi" ? result.distance * 0.621371 : result.distance;
  }, [distanceUnit, result]);

  if (!result) {
    return (
      <div className="empty-result">
        <span>🧭</span><h1>No hay un resultado disponible</h1>
        <p>Realiza un cálculo para generar el informe de tu viaje.</p>
        <Link to="/calculadora">Ir a la calculadora</Link>
      </div>
    );
  }

  const costFormatter = new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "CLP" ? 0 : 2,
  });

  const shareResult = async () => {
    const text = `Viaje ${result.originLabel || "Origen"} → ${result.destinationLabel || "Destino"}: ${distance.toFixed(1)} ${distanceUnit}, ${result.fuelUsed} L.`;
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Resumen copiado al portapapeles.");
    } catch {
      setNotice("No fue posible copiar el resumen.");
    }
  };

  return (
    <div className="result-page">
      <header className="result-header">
        <div>
          <span className="result-kicker">Informe de viaje {result.isDemo && "· Demostración"}</span>
          <h1>{result.originLabel || "Origen"} <span>→</span> {result.destinationLabel || "Destino"}</h1>
          <p>Estimación basada en vehículo, carga, clima y perfil de ruta.</p>
        </div>
        <div className="result-actions">
          <button type="button" onClick={shareResult}>Compartir resumen</button>
          <Link to="/calculadora">Nuevo cálculo</Link>
        </div>
      </header>

      {notice && <div className="result-notice" role="status">{notice}</div>}

      <section className="result-settings" aria-label="Preferencias de visualización">
        <label>Moneda<select value={currency} onChange={(event) => setCurrency(event.target.value)}><option>CLP</option><option>USD</option><option>EUR</option></select></label>
        <label>Distancia<select value={distanceUnit} onChange={(event) => setDistanceUnit(event.target.value)}><option value="km">Kilómetros</option><option value="mi">Millas</option></select></label>
        <p>La moneda cambia el formato; no aplica conversión de tipo de cambio.</p>
      </section>

      <section className="metric-grid">
        <article><span>Distancia</span><strong>{distance.toFixed(1)} {distanceUnit}</strong><small>Ruta calculada</small></article>
        <article><span>Combustible</span><strong>{result.fuelUsed ?? 0} L</strong><small>{result.adjustedFC ?? 0} L/100 km ajustado</small></article>
        <article className="metric-highlight"><span>Costo estimado</span><strong>{costFormatter.format(result.totalCost || 0)}</strong><small>Según precio ingresado</small></article>
        <article><span>Clima</span><strong>{result.weather || "Sin datos"}</strong><small>Pendiente media {result.roadGrade ?? 0}%</small></article>
      </section>

      <section className="chart-grid">
        <LineChart data={result.elevationProfile} valueKey="elevation" label="Perfil de elevación" unit="m" />
        <LineChart data={result.consumptionProfile} valueKey="consumption_l100km" label="Consumo por segmento" unit="L/100 km" color="#ef8a3c" />
      </section>

      <section className="result-detail-grid">
        <article>
          <h2>Vehículo</h2>
          <dl><div><dt>Marca y modelo</dt><dd>{result.vehicle?.make || "-"} {result.vehicle?.model || ""}</dd></div><div><dt>Año</dt><dd>{result.vehicle?.year || "-"}</dd></div><div><dt>Motor</dt><dd>{result.vehicle?.engine_cc ? `${result.vehicle.engine_cc} cc` : "-"}</dd></div><div><dt>Consumo base</dt><dd>{result.baseFC ?? "-"} L/100 km</dd></div></dl>
        </article>
        <article>
          <h2>Cómo se calculó</h2>
          <ol><li>Consumo base del vehículo.</li><li>Ajuste por pasajeros y carga.</li><li>Análisis de {result.segmentsAnalyzed || 0} segmentos.</li><li>Pendiente y elevación de la ruta.</li><li>Condiciones climáticas de origen.</li></ol>
        </article>
      </section>
    </div>
  );
};

export default Result;
