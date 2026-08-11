import { Link, useNavigate } from "react-router-dom";
import { demoTrip } from "../data/demoTrip";
import "../styles/Landing.css";

const Landing = () => {
  const navigate = useNavigate();

  const openDemo = () => {
    sessionStorage.setItem("travelCalculator:lastResult", JSON.stringify(demoTrip));
    navigate("/resultado", { state: { result: demoTrip } });
  };

  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="hero-copy">
          <span className="hero-kicker">Una estimación más allá de distancia × consumo</span>
          <h1>Calcula cuánto costará realmente tu ruta.</h1>
          <p>
            Las calculadoras tradicionales usan un promedio fijo. Travel Calculator
            analiza tu vehículo y divide la ruta en segmentos para ajustar el consumo
            según pendiente, tipo de vía, clima, pasajeros, carga y precio actual del combustible.
          </p>
          <div className="hero-actions">
            <Link className="primary-cta" to="/calculadora">Calcular un viaje</Link>
            <button className="secondary-cta" type="button" onClick={openDemo}>
              Ver resultado de demostración
            </button>
          </div>
          <div className="hero-proof" aria-label="Características principales">
            <span>✓ Consumo por segmento</span><span>✓ Elevación real</span><span>✓ Resultado explicable</span>
          </div>
        </div>

        <div className="hero-preview" aria-hidden="true">
          <div className="preview-route"><span>A</span><i /><span>B</span></div>
          <div className="preview-metric"><small>Distancia</small><strong>42,1 km</strong></div>
          <div className="preview-metric"><small>Consumo</small><strong>3,61 L</strong></div>
          <div className="preview-metric accent"><small>Costo estimado</small><strong>$5.054</strong></div>
        </div>
      </section>

      <section className="landing-features">
        <article><span>01</span><h2>Base específica del vehículo</h2><p>Considera consumo mixto o de carretera, combustible, motor, peso y calibración histórica.</p></article>
        <article><span>02</span><h2>Cada tramo importa</h2><p>La ruta se divide en segmentos con pendientes positivas y negativas, elevación y tipo de vía predominante.</p></article>
        <article><span>03</span><h2>Condiciones reales del viaje</h2><p>Ajusta por clima, tráfico urbano o carretera, pasajeros, equipaje y precio actual ingresado.</p></article>
      </section>

      <section className="landing-stack">
        <p>Construido con</p>
        <div><span>React</span><span>Flask</span><span>PostgreSQL</span><span>Google Maps</span><span>OpenWeather</span></div>
      </section>
    </div>
  );
};

export default Landing;
